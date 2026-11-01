import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  modelKeyForCategory,
  type CreateOdometerInput,
  type CreateVehicleInput,
  type UpdateRuleInput,
  type UpdateVehicleInput,
  type VehicleCategory,
} from '@prime-garage/shared';
import { v7 as uuidv7 } from 'uuid';
import { stringToDateOnly } from '../../common/dates.js';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { StorageService } from '../../common/storage.service.js';
import { toVehicleDto } from '../../common/serializers.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GarageAccessService,
    private readonly realtime: RealtimeService,
    private readonly storage: StorageService,
  ) {}

  async photoUrl(photoAttachmentId: string | null): Promise<string | null> {
    return photoAttachmentId ? this.storage.signedUrl(photoAttachmentId) : null;
  }

  async list(userId: string, includeArchived: boolean) {
    const garageIds = await this.access.garageIdsForUser(userId);
    const rows = await this.prisma.vehicle.findMany({
      where: { garageId: { in: garageIds }, ...(includeArchived ? {} : { archivedAt: null }) },
      include: { vehicleModel: { include: { brand: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(rows.map(async (v) => toVehicleDto(v, await this.photoUrl(v.photoAttachmentId))));
  }

  async create(userId: string, input: CreateVehicleInput) {
    const garageId = input.garageId ?? (await this.access.defaultGarageId(userId));
    await this.access.assertGarage(userId, garageId, 'editor');

    const model = input.vehicleModelId
      ? await this.prisma.vehicleModel.findUnique({ where: { id: input.vehicleModelId } })
      : null;
    if (input.vehicleModelId && !model) throw new BadRequestException('Model kendaraan tidak ditemukan di katalog');

    const category = (model?.category ?? input.category ?? 'other') as VehicleCategory;
    const kind = model?.kind ?? input.kind;
    const model3dKey = model?.model3dKey ?? modelKeyForCategory(category);
    const now = new Date();
    const id = uuidv7();

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.create({
        data: {
          id,
          garageId,
          vehicleModelId: model?.id ?? null,
          kind,
          category,
          customBrand: model ? null : input.customBrand,
          customModel: model ? null : input.customModel,
          nickname: input.nickname,
          plateNumber: input.plateNumber?.toUpperCase() ?? null,
          year: input.year ?? null,
          color: input.color,
          engineCc: input.engineCc ?? model?.engineCc ?? null,
          frameNumber: input.frameNumber,
          engineNumber: input.engineNumber,
          purchaseDate: stringToDateOnly(input.purchaseDate),
          initialOdometerKm: input.initialOdometerKm,
          currentOdometerKm: input.initialOdometerKm,
          currentOdometerAt: now,
          model3dKey,
          createdById: userId,
        },
      });
      await tx.odometerLog.create({
        data: { vehicleId: id, km: input.initialOdometerKm, recordedAt: now, source: 'initial', createdById: userId },
      });
      await this.copyRuleTemplates(tx, id, category, kind, model?.id ?? null);
    });

    this.realtime.emitToGarage(REALTIME_EVENTS.vehicleChanged, { garageId, vehicleId: id });
    return this.get(userId, id);
  }

  /** Copies default intervals: category templates, overridden by model-specific ones (FR-MNT-01). */
  private async copyRuleTemplates(tx: Tx, vehicleId: string, category: VehicleCategory, kind: string, modelId: number | null) {
    let templates = await tx.maintenanceRuleTemplate.findMany({
      where: { OR: [{ category, vehicleModelId: null }, ...(modelId ? [{ vehicleModelId: modelId }] : [])] },
    });
    if (!templates.some((t) => t.vehicleModelId == null) && kind === 'motorcycle') {
      // Category without its own table yet: fall back to the underbone defaults.
      templates = templates.concat(
        await tx.maintenanceRuleTemplate.findMany({ where: { category: 'underbone', vehicleModelId: null } }),
      );
    }
    const byKey = new Map<string, (typeof templates)[number]>();
    for (const t of templates) {
      const key = `${t.partCode}:${t.action}`;
      const existing = byKey.get(key);
      if (!existing || (t.vehicleModelId != null && existing.vehicleModelId == null)) byKey.set(key, t);
    }
    if (byKey.size === 0) return;
    await tx.vehicleMaintenanceRule.createMany({
      data: [...byKey.values()].map((t) => ({
        id: uuidv7(),
        vehicleId,
        partCode: t.partCode,
        action: t.action,
        intervalKm: t.intervalKm,
        intervalMonths: t.intervalMonths,
        resetActions: t.resetActions as Prisma.InputJsonValue,
        templateId: t.id,
      })),
    });
  }

  async get(userId: string, vehicleId: string) {
    const v = await this.access.vehicle(userId, vehicleId);
    return toVehicleDto(v, await this.photoUrl(v.photoAttachmentId));
  }

  async update(userId: string, vehicleId: string, input: UpdateVehicleInput) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    const data: Prisma.VehicleUpdateInput = {
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber?.toUpperCase() ?? null } : {}),
      ...(input.year !== undefined ? { year: input.year ?? null } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.engineCc !== undefined ? { engineCc: input.engineCc ?? null } : {}),
      ...(input.frameNumber !== undefined ? { frameNumber: input.frameNumber } : {}),
      ...(input.engineNumber !== undefined ? { engineNumber: input.engineNumber } : {}),
      ...(input.purchaseDate !== undefined ? { purchaseDate: stringToDateOnly(input.purchaseDate) } : {}),
      ...(v.vehicleModelId == null && input.customBrand !== undefined ? { customBrand: input.customBrand } : {}),
      ...(v.vehicleModelId == null && input.customModel !== undefined ? { customModel: input.customModel } : {}),
      ...(v.vehicleModelId == null && input.category !== undefined
        ? { category: input.category, model3d: { connect: { key: modelKeyForCategory(input.category) } } }
        : {}),
    };
    await this.prisma.vehicle.update({ where: { id: vehicleId }, data });
    this.realtime.emitToGarage(REALTIME_EVENTS.vehicleChanged, { garageId: v.garageId, vehicleId });
    return this.get(userId, vehicleId);
  }

  async setArchived(userId: string, vehicleId: string, archived: boolean) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { archivedAt: archived ? new Date() : null } });
    this.realtime.emitToGarage(REALTIME_EVENTS.vehicleChanged, { garageId: v.garageId, vehicleId });
    return this.get(userId, vehicleId);
  }

  async remove(userId: string, vehicleId: string) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    const serviceIds = (await this.prisma.serviceRecord.findMany({ where: { vehicleId }, select: { id: true } })).map((s) => s.id);
    const files = await this.prisma.attachment.findMany({
      where: {
        OR: [
          { ownerType: 'vehicle', ownerId: vehicleId },
          { ownerType: 'service_record', ownerId: { in: serviceIds } },
        ],
      },
      select: { id: true, filePath: true },
    });
    await this.prisma.$transaction([
      this.prisma.attachment.deleteMany({ where: { id: { in: files.map((f) => f.id) } } }),
      this.prisma.vehicle.delete({ where: { id: vehicleId } }),
    ]);
    await this.storage.remove(files.map((f) => f.filePath));
    this.realtime.emitToGarage(REALTIME_EVENTS.vehicleChanged, { garageId: v.garageId, vehicleId });
  }

  async completeTour(userId: string, vehicleId: string) {
    const v = await this.access.vehicle(userId, vehicleId, 'viewer');
    await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { eduTourCompletedAt: new Date() } });
    this.realtime.emitToGarage(REALTIME_EVENTS.vehicleChanged, { garageId: v.garageId, vehicleId });
    return this.get(userId, vehicleId);
  }

  // ---------- Odometer ----------

  async listOdometer(userId: string, vehicleId: string) {
    await this.access.vehicle(userId, vehicleId);
    return this.prisma.odometerLog.findMany({
      where: { vehicleId },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async addOdometer(userId: string, vehicleId: string, input: CreateOdometerInput) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
    if (recordedAt.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException('Waktu odometer tidak boleh di masa depan');

    const previous = await this.prisma.odometerLog.findFirst({
      where: { vehicleId, recordedAt: { lte: recordedAt } },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (previous && input.km < previous.km && !input.confirmDecrease) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ODOMETER_DECREASE',
        message: `Odometer lebih kecil dari catatan sebelumnya (${previous.km} km). Konfirmasi jika speedometer diganti atau direset.`,
      });
    }
    const log = await this.prisma.odometerLog.create({
      data: { vehicleId, km: input.km, recordedAt, source: 'manual', note: input.note, createdById: userId },
    });
    await this.refreshCurrentOdometer(this.prisma, vehicleId);
    this.realtime.emitToGarage(REALTIME_EVENTS.odometerChanged, { garageId: v.garageId, vehicleId, id: log.id });
    return log;
  }

  async deleteOdometer(userId: string, vehicleId: string, logId: string) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    const log = await this.prisma.odometerLog.findFirst({ where: { id: logId, vehicleId } });
    if (!log) throw new BadRequestException('Catatan odometer tidak ditemukan');
    if (log.source !== 'manual') throw new BadRequestException('Hanya catatan odometer manual yang dapat dihapus');
    await this.prisma.odometerLog.delete({ where: { id: logId } });
    await this.refreshCurrentOdometer(this.prisma, vehicleId);
    this.realtime.emitToGarage(REALTIME_EVENTS.odometerChanged, { garageId: v.garageId, vehicleId });
  }

  /** Keeps vehicles.current_odometer_* in sync with the latest odometer log. */
  async refreshCurrentOdometer(db: Tx | PrismaService, vehicleId: string): Promise<void> {
    const latest = await db.odometerLog.findFirst({
      where: { vehicleId },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (!latest) return;
    await db.vehicle.update({
      where: { id: vehicleId },
      data: { currentOdometerKm: latest.km, currentOdometerAt: latest.recordedAt },
    });
  }

  // ---------- Rules ----------

  async listRules(userId: string, vehicleId: string) {
    await this.access.vehicle(userId, vehicleId);
    return this.prisma.vehicleMaintenanceRule.findMany({ where: { vehicleId }, orderBy: [{ partCode: 'asc' }, { action: 'asc' }] });
  }

  async updateRule(userId: string, vehicleId: string, ruleId: string, input: UpdateRuleInput) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    const rule = await this.prisma.vehicleMaintenanceRule.findFirst({ where: { id: ruleId, vehicleId } });
    if (!rule) throw new BadRequestException('Aturan perawatan tidak ditemukan');
    const intervalKm = input.intervalKm !== undefined ? input.intervalKm : rule.intervalKm;
    const intervalMonths = input.intervalMonths !== undefined ? input.intervalMonths : rule.intervalMonths;
    if (intervalKm == null && intervalMonths == null) {
      throw new BadRequestException('Minimal salah satu interval (km atau bulan) harus diisi');
    }
    const intervalChanged = input.intervalKm !== undefined || input.intervalMonths !== undefined;
    const updated = await this.prisma.vehicleMaintenanceRule.update({
      where: { id: ruleId },
      data: {
        intervalKm,
        intervalMonths,
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        ...(input.snoozedUntil !== undefined ? { snoozedUntil: stringToDateOnly(input.snoozedUntil) } : {}),
        ...(intervalChanged ? { isCustomized: true } : {}),
      },
    });
    this.realtime.emitToGarage(REALTIME_EVENTS.rulesChanged, { garageId: v.garageId, vehicleId, id: ruleId });
    return updated;
  }

  async resetRule(userId: string, vehicleId: string, ruleId: string) {
    const v = await this.access.vehicle(userId, vehicleId, 'editor');
    const rule = await this.prisma.vehicleMaintenanceRule.findFirst({ where: { id: ruleId, vehicleId } });
    if (!rule?.templateId) throw new BadRequestException('Aturan ini tidak punya nilai default');
    const t = await this.prisma.maintenanceRuleTemplate.findUniqueOrThrow({ where: { id: rule.templateId } });
    const updated = await this.prisma.vehicleMaintenanceRule.update({
      where: { id: ruleId },
      data: { intervalKm: t.intervalKm, intervalMonths: t.intervalMonths, isCustomized: false },
    });
    this.realtime.emitToGarage(REALTIME_EVENTS.rulesChanged, { garageId: v.garageId, vehicleId, id: ruleId });
    return updated;
  }
}
