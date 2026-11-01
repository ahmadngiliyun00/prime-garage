import { BadRequestException, Injectable } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  itemSubtotal,
  serviceTotal,
  toCalendarDate,
  type ServiceRecordDto,
  type ServiceRecordInput,
} from '@prime-garage/shared';
import { v7 as uuidv7 } from 'uuid';
import { dateOnlyToString, decimalToNumber, iso, stringToDateOnly } from '../../common/dates.js';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { toServiceItemDto } from '../../common/serializers.js';
import { StorageService } from '../../common/storage.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';

const recordInclude = {
  items: { orderBy: { sortOrder: 'asc' } },
  workshop: { select: { id: true, name: true, type: true, certification: true } },
} satisfies Prisma.ServiceRecordInclude;

type RecordWithRelations = Prisma.ServiceRecordGetPayload<{ include: typeof recordInclude }>;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GarageAccessService,
    private readonly vehicles: VehiclesService,
    private readonly realtime: RealtimeService,
    private readonly storage: StorageService,
  ) {}

  private async toDto(records: RecordWithRelations[]): Promise<ServiceRecordDto[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: { ownerType: 'service_record', ownerId: { in: records.map((r) => r.id) } },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      workshop: r.workshop,
      serviceDate: dateOnlyToString(r.serviceDate),
      odometerKm: r.odometerKm,
      mechanicName: r.mechanicName,
      laborCost: decimalToNumber(r.laborCost),
      totalCost: decimalToNumber(r.totalCost) ?? 0,
      notes: r.notes,
      items: r.items.map(toServiceItemDto),
      attachments: attachments
        .filter((a) => a.ownerId === r.id)
        .map((a) => ({
          id: a.id,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          width: a.width,
          height: a.height,
          url: this.storage.signedUrl(a.id),
          createdAt: iso(a.createdAt),
        })),
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));
  }

  async list(userId: string, vehicleId: string, partCode?: string): Promise<ServiceRecordDto[]> {
    await this.access.vehicle(userId, vehicleId);
    const rows = await this.prisma.serviceRecord.findMany({
      where: { vehicleId, ...(partCode ? { items: { some: { partCode } } } : {}) },
      include: recordInclude,
      orderBy: [{ serviceDate: 'desc' }, { odometerKm: 'desc' }],
    });
    return this.toDto(rows);
  }

  async get(userId: string, serviceId: string): Promise<ServiceRecordDto> {
    await this.access.serviceRecord(userId, serviceId);
    const row = await this.prisma.serviceRecord.findUniqueOrThrow({ where: { id: serviceId }, include: recordInclude });
    const [dto] = await this.toDto([row]);
    return dto!;
  }

  private async assertWorkshop(garageId: string, workshopId: string | null | undefined) {
    if (!workshopId) return;
    const ws = await this.prisma.workshop.findUnique({ where: { id: workshopId }, select: { garageId: true } });
    if (!ws || ws.garageId !== garageId) throw new BadRequestException('Bengkel tidak ditemukan di garasi ini');
  }

  private itemsData(input: ServiceRecordInput) {
    return input.items.map((item, index) => ({
      id: uuidv7(),
      partCode: item.partCode ? item.partCode : null,
      customPartName: item.customPartName,
      action: item.action,
      productName: item.productName,
      quantity: item.quantity ?? null,
      unit: item.unit,
      unitPrice: item.unitPrice ?? null,
      subtotal: itemSubtotal(item) || null,
      notes: item.notes,
      sortOrder: index,
    }));
  }

  /** Odometer reading time for a service: now when the service is today, otherwise noon WIB of that day. */
  private recordedAtFor(serviceDate: string, timezone: string): Date {
    return toCalendarDate(new Date(), timezone) === serviceDate ? new Date() : new Date(`${serviceDate}T05:00:00.000Z`);
  }

  private async timezoneOf(userId: string): Promise<string> {
    return (await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })).timezone;
  }

  async create(userId: string, vehicleId: string, input: ServiceRecordInput): Promise<ServiceRecordDto> {
    const vehicle = await this.access.vehicle(userId, vehicleId, 'editor');
    await this.assertWorkshop(vehicle.garageId, input.workshopId);
    const timezone = await this.timezoneOf(userId);
    const id = uuidv7();

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRecord.create({
        data: {
          id,
          vehicleId,
          workshopId: input.workshopId ?? null,
          serviceDate: stringToDateOnly(input.serviceDate),
          odometerKm: input.odometerKm,
          mechanicName: input.mechanicName,
          laborCost: input.laborCost ?? null,
          totalCost: serviceTotal(input),
          notes: input.notes,
          createdById: userId,
          items: { create: this.itemsData(input) },
        },
      });
      await tx.odometerLog.create({
        data: {
          vehicleId,
          km: input.odometerKm,
          recordedAt: this.recordedAtFor(input.serviceDate, timezone),
          source: 'service',
          serviceRecordId: id,
          createdById: userId,
        },
      });
      await this.vehicles.refreshCurrentOdometer(tx, vehicleId);
    });

    this.realtime.emitToGarage(REALTIME_EVENTS.serviceChanged, { garageId: vehicle.garageId, vehicleId, id });
    return this.get(userId, id);
  }

  async update(userId: string, serviceId: string, input: ServiceRecordInput): Promise<ServiceRecordDto> {
    const record = await this.access.serviceRecord(userId, serviceId, 'editor');
    await this.assertWorkshop(record.vehicle.garageId, input.workshopId);
    const timezone = await this.timezoneOf(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceItem.deleteMany({ where: { serviceRecordId: serviceId } });
      await tx.serviceRecord.update({
        where: { id: serviceId },
        data: {
          workshopId: input.workshopId ?? null,
          serviceDate: stringToDateOnly(input.serviceDate),
          odometerKm: input.odometerKm,
          mechanicName: input.mechanicName,
          laborCost: input.laborCost ?? null,
          totalCost: serviceTotal(input),
          notes: input.notes,
          items: { create: this.itemsData(input) },
        },
      });
      await tx.odometerLog.upsert({
        where: { serviceRecordId: serviceId },
        create: {
          vehicleId: record.vehicleId,
          km: input.odometerKm,
          recordedAt: this.recordedAtFor(input.serviceDate, timezone),
          source: 'service',
          serviceRecordId: serviceId,
          createdById: userId,
        },
        update: { km: input.odometerKm, recordedAt: this.recordedAtFor(input.serviceDate, timezone) },
      });
      await this.vehicles.refreshCurrentOdometer(tx, record.vehicleId);
    });

    this.realtime.emitToGarage(REALTIME_EVENTS.serviceChanged, {
      garageId: record.vehicle.garageId,
      vehicleId: record.vehicleId,
      id: serviceId,
    });
    return this.get(userId, serviceId);
  }

  async remove(userId: string, serviceId: string): Promise<void> {
    const record = await this.access.serviceRecord(userId, serviceId, 'editor');
    const files = await this.prisma.attachment.findMany({
      where: { ownerType: 'service_record', ownerId: serviceId },
      select: { id: true, filePath: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany({ where: { id: { in: files.map((f) => f.id) } } });
      await tx.serviceRecord.delete({ where: { id: serviceId } }); // cascades to items and its odometer log
      await this.vehicles.refreshCurrentOdometer(tx, record.vehicleId);
    });
    await this.storage.remove(files.map((f) => f.filePath));
    this.realtime.emitToGarage(REALTIME_EVENTS.serviceChanged, {
      garageId: record.vehicle.garageId,
      vehicleId: record.vehicleId,
      id: serviceId,
    });
  }
}
