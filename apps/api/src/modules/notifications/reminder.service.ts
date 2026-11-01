import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  REALTIME_EVENTS,
  diffDays,
  formatDateId,
  formatKm,
  odometerStaleDedupeKey,
  reminderForStatus,
  toCalendarDate,
  type ComponentStatusDto,
  type NotificationType,
  type ServiceAction,
} from '@prime-garage/shared';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { v7 as uuidv7 } from 'uuid';
import { env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { MaintenanceService } from '../maintenance/maintenance.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

const ACTION_VERB: Record<ServiceAction, string> = {
  replace: 'diganti',
  top_up: 'ditambah',
  inspect: 'diperiksa',
  adjust: 'disetel',
  clean: 'dibersihkan',
  lubricate: 'dilumasi',
  repair: 'diperbaiki',
  other: 'diservis',
};

const MAX_ATTEMPTS = 3;
const RETRY_WINDOW_MS = 3 * 86_400_000;

export type ReminderRunSummary = {
  vehicles: number;
  created: number;
  pushSent: number;
  emailSent: number;
  failed: number;
};

type Draft = {
  userId: string;
  vehicleId: string;
  garageId: string;
  ruleId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey: string;
  data: Prisma.InputJsonValue;
};

function escapeHtml(s: string): string {
  return s.replace(/[<>"'&]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Daily reminder job (docs/MAINTENANCE-LOGIC.md section 5). Runs in the worker process only. */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly expo = new Expo(env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {});
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenance: MaintenanceService,
    private readonly mail: MailService,
    private readonly realtime: RealtimeService,
  ) {}

  @Cron(env.REMINDER_CRON, { name: 'daily-reminders', timeZone: 'UTC' })
  async scheduled(): Promise<void> {
    await this.run();
  }

  async run(now: Date = new Date()): Promise<ReminderRunSummary> {
    if (this.running) {
      this.logger.warn('Previous reminder run still in progress, skipping');
      return { vehicles: 0, created: 0, pushSent: 0, emailSent: 0, failed: 0 };
    }
    this.running = true;
    try {
      const { vehicles, created } = await this.generate(now);
      const delivered = await this.deliver(now);
      const summary = { vehicles, created, ...delivered };
      this.logger.log(`Reminder run: ${JSON.stringify(summary)}`);
      return summary;
    } finally {
      this.running = false;
    }
  }

  // ---------- 1. Generate notifications ----------

  private async generate(now: Date): Promise<{ vehicles: number; created: number }> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { archivedAt: null, rules: { some: { isEnabled: true } } },
      include: {
        garage: { include: { members: { include: { user: { select: { id: true, timezone: true } } } } } },
        serviceRecords: { select: { id: true, workshop: { select: { name: true } } } },
      },
    });

    let created = 0;
    for (const vehicle of vehicles) {
      const workshopByService = new Map(vehicle.serviceRecords.map((s) => [s.id, s.workshop?.name ?? null]));
      const byTimezone = new Map<string, ComponentStatusDto[]>();

      for (const member of vehicle.garage.members) {
        const tz = member.user.timezone;
        let statuses = byTimezone.get(tz);
        if (!statuses) {
          statuses = await this.maintenance.componentsForVehicle(vehicle, tz, now);
          byTimezone.set(tz, statuses);
        }
        const today = toCalendarDate(now, tz);
        const drafts: Draft[] = [];

        for (const s of statuses) {
          if (s.snoozedUntil && s.snoozedUntil >= today) continue;
          const candidate = reminderForStatus(s);
          if (!candidate) continue;
          drafts.push(this.componentDraft(vehicle, member.userId, s, candidate.type, candidate.dedupeKey, workshopByService));
        }

        const first = statuses[0];
        if (first?.isOdometerStale) {
          const days = diffDays(toCalendarDate(vehicle.currentOdometerAt, tz), today);
          drafts.push({
            userId: member.userId,
            vehicleId: vehicle.id,
            garageId: vehicle.garageId,
            ruleId: null,
            type: 'odometer_stale',
            title: `Perbarui odometer ${vehicle.nickname}`,
            body: `Odometer terakhir dicatat ${days} hari lalu (${formatKm(vehicle.currentOdometerKm)}). Perbarui agar perkiraan servis tetap akurat.`,
            dedupeKey: `${odometerStaleDedupeKey(vehicle.id, today)}:${member.userId}`,
            data: { url: `/vehicles/${vehicle.id}`, vehicleId: vehicle.id },
          });
        }

        for (const d of drafts) {
          if (await this.insert(d, now)) created++;
        }
      }
    }
    return { vehicles: vehicles.length, created };
  }

  private componentDraft(
    vehicle: { id: string; garageId: string; nickname: string },
    userId: string,
    s: ComponentStatusDto,
    type: 'component_soon' | 'component_due',
    dedupeKey: string,
    workshopByService: Map<string, string | null>,
  ): Draft {
    const verb = ACTION_VERB[s.action];
    const last = s.baseline
      ? `Terakhir ${formatDateId(s.baseline.date)} di ${formatKm(s.baseline.km)}` +
        (s.baseline.source === 'service' && workshopByService.get(s.baseline.key)
          ? ` (${workshopByService.get(s.baseline.key)})`
          : '') +
        '.'
      : '';
    const due = [s.dueDate ? formatDateId(s.dueDate) : null, s.dueKm != null ? formatKm(s.dueKm) : null]
      .filter(Boolean)
      .join(' atau ');

    let title: string;
    let body: string;
    if (type === 'component_soon') {
      title = `${s.partName} ${vehicle.nickname} segera perlu ${verb}`;
      body = `Sisa umur sekitar ${s.remainingPercent ?? 0}%. Perkiraan jatuh tempo ${due}. ${last}`;
    } else {
      const over = [
        s.overdueDays > 0 ? `${s.overdueDays} hari` : null,
        s.overdueKm > 0 ? formatKm(s.overdueKm) : null,
      ]
        .filter(Boolean)
        .join(' / ');
      title = `${s.partName} ${vehicle.nickname} jatuh tempo, perlu ${verb}`;
      body = `${over ? `Lewat ${over} dari jadwal. ` : ''}${last} Perkiraan odometer sekarang ${formatKm(s.estimatedKm)}.`;
    }
    return {
      userId,
      vehicleId: vehicle.id,
      garageId: vehicle.garageId,
      ruleId: s.ruleId,
      type,
      title: title.slice(0, 150),
      body: body.trim().slice(0, 500),
      dedupeKey: `${dedupeKey}:${userId}`.slice(0, 191),
      data: {
        url: `/vehicles/${vehicle.id}`,
        vehicleId: vehicle.id,
        partCode: s.partCode,
        status: s.status,
        remainingPercent: s.remainingPercent,
        dueDate: s.dueDate,
      },
    };
  }

  /** Inserts a notification and its delivery rows. Returns false when the dedupe key already exists. */
  private async insert(d: Draft, now: Date): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: d.userId },
      select: { notifyPush: true, notifyEmail: true, _count: { select: { pushTokens: true } } },
    });
    try {
      const id = uuidv7();
      await this.prisma.notification.create({
        data: {
          id,
          userId: d.userId,
          vehicleId: d.vehicleId,
          ruleId: d.ruleId,
          type: d.type,
          title: d.title,
          body: d.body,
          data: d.data,
          dedupeKey: d.dedupeKey,
          createdAt: now,
          deliveries: {
            create: [
              { channel: 'push', status: user.notifyPush && user._count.pushTokens > 0 ? 'pending' : 'skipped' },
              { channel: 'email', status: user.notifyEmail && this.mail.enabled ? 'pending' : 'skipped' },
            ],
          },
        },
      });
      this.realtime.emitToUser(d.userId, REALTIME_EVENTS.notificationCreated, { garageId: d.garageId, vehicleId: d.vehicleId, id });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  // ---------- 2. Deliver (one digest per user per channel) ----------

  private async deliver(now: Date): Promise<{ pushSent: number; emailSent: number; failed: number }> {
    const pending = await this.prisma.notificationDelivery.findMany({
      where: {
        status: { in: ['pending', 'failed'] },
        attempts: { lt: MAX_ATTEMPTS },
        createdAt: { gte: new Date(now.getTime() - RETRY_WINDOW_MS) },
      },
      include: { notification: { include: { user: { include: { pushTokens: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    const groups = new Map<string, typeof pending>();
    for (const d of pending) {
      const key = `${d.notification.userId}:${d.channel}`;
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }

    let pushSent = 0;
    let emailSent = 0;
    let failed = 0;
    for (const deliveries of groups.values()) {
      const first = deliveries[0]!;
      const user = first.notification.user;
      const notes = deliveries.map((d) => d.notification);
      const ids = deliveries.map((d) => d.id);
      try {
        if (first.channel === 'push') {
          await this.sendPush(user.pushTokens.map((t) => t.token), notes);
          pushSent++;
        } else {
          await this.sendEmail(user.email, user.name, notes);
          emailSent++;
        }
        await this.prisma.notificationDelivery.updateMany({
          where: { id: { in: ids } },
          data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 }, error: null },
        });
      } catch (e) {
        failed++;
        const message = (e as Error).message.slice(0, 500);
        this.logger.warn(`Delivery ${first.channel} to ${user.id} failed: ${message}`);
        await this.prisma.notificationDelivery.updateMany({
          where: { id: { in: ids } },
          data: { status: 'failed', attempts: { increment: 1 }, error: message },
        });
      }
    }
    return { pushSent, emailSent, failed };
  }

  private digestTitle(notes: { title: string }[]): string {
    return notes.length === 1 ? notes[0]!.title : `${notes.length} hal di kendaraanmu perlu perhatian`;
  }

  private async sendPush(tokens: string[], notes: { title: string; body: string; data: Prisma.JsonValue }[]): Promise<void> {
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (valid.length === 0) throw new Error('No valid push token');
    const body = notes.length === 1 ? notes[0]!.body : notes.map((n) => `• ${n.title}`).join('\n');
    const data = notes.length === 1 ? ((notes[0]!.data as Record<string, unknown>) ?? {}) : { url: '/notifications' };
    const messages: ExpoPushMessage[] = valid.map((to) => ({
      to,
      title: this.digestTitle(notes),
      body: body.slice(0, 1000),
      data,
      sound: 'default',
      channelId: 'reminders',
    }));

    let ok = 0;
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      for (const [i, ticket] of tickets.entries()) {
        if (ticket.status === 'ok') ok++;
        else if (ticket.details?.error === 'DeviceNotRegistered') {
          const token = chunk[i]?.to;
          if (typeof token === 'string') await this.prisma.pushToken.deleteMany({ where: { token } });
        }
      }
    }
    if (ok === 0) throw new Error('Expo rejected all push messages');
  }

  private async sendEmail(to: string, name: string, notes: { title: string; body: string }[]): Promise<void> {
    const subject =
      notes.length === 1 ? `PrimeGarage: ${notes[0]!.title}` : `PrimeGarage: ${notes.length} hal di kendaraanmu perlu perhatian`;
    const rows = notes
      .map(
        (n) =>
          `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(n.title)}</strong><br><span style="color:#4b5563">${escapeHtml(n.body)}</span></td></tr>`,
      )
      .join('');
    const url = `${env.APP_WEB_URL}/notifications`;
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px">
<table style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:24px" width="100%">
<tr><td><h2 style="margin:0 0 8px;color:#111827">Halo ${escapeHtml(name)},</h2>
<p style="color:#374151;margin:0 0 16px">Berikut pengingat perawatan kendaraanmu dari PrimeGarage.</p></td></tr>
${rows}
<tr><td style="padding-top:20px"><a href="${url}" style="background:#dc2626;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Buka PrimeGarage</a></td></tr>
<tr><td style="padding-top:20px;color:#9ca3af;font-size:12px">Estimasi dihitung dari jarak tempuh dan waktu. Matikan email pengingat di menu Pengaturan.</td></tr>
</table></body></html>`;
    const text = `Halo ${name},\n\n${notes.map((n) => `- ${n.title}\n  ${n.body}`).join('\n')}\n\nBuka: ${url}`;
    await this.mail.send(to, subject, html, text);
  }
}
