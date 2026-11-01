import type {
  NotificationDto,
  OdometerLogDto,
  RuleDto,
  ServiceAction,
  ServiceItemDto,
  UserDto,
  VehicleCategory,
  VehicleDto,
  WorkshopDto,
} from '@prime-garage/shared';
import { getPart } from '@prime-garage/shared';
import type {
  Brand,
  Notification,
  OdometerLog,
  ServiceItem,
  User,
  Vehicle,
  VehicleMaintenanceRule,
  VehicleModel,
  Workshop,
} from '../generated/prisma/client.js';
import { dateOnlyToString, decimalToNumber, iso } from './dates.js';

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    timezone: u.timezone,
    locale: u.locale,
    notifyPush: u.notifyPush,
    notifyEmail: u.notifyEmail,
    createdAt: iso(u.createdAt),
  };
}

type VehicleWithModel = Vehicle & { vehicleModel: (VehicleModel & { brand: Brand }) | null };

export function toVehicleDto(v: VehicleWithModel, photoUrl: string | null = null): VehicleDto {
  const brandName = v.vehicleModel?.brand.name ?? v.customBrand ?? null;
  const modelName = v.vehicleModel?.name ?? v.customModel ?? null;
  const displayName = [brandName, modelName].filter(Boolean).join(' ') || v.nickname;
  return {
    id: v.id,
    garageId: v.garageId,
    vehicleModelId: v.vehicleModelId,
    kind: v.kind,
    category: v.category as VehicleCategory,
    brandName,
    modelName,
    displayName,
    nickname: v.nickname,
    plateNumber: v.plateNumber,
    year: v.year,
    color: v.color,
    engineCc: v.engineCc,
    frameNumber: v.frameNumber,
    engineNumber: v.engineNumber,
    purchaseDate: dateOnlyToString(v.purchaseDate),
    initialOdometerKm: v.initialOdometerKm,
    currentOdometerKm: v.currentOdometerKm,
    currentOdometerAt: iso(v.currentOdometerAt),
    model3dKey: v.model3dKey,
    photoUrl,
    eduTourCompletedAt: iso(v.eduTourCompletedAt),
    archivedAt: iso(v.archivedAt),
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
  };
}

export function toOdometerDto(o: OdometerLog): OdometerLogDto {
  return {
    id: o.id,
    vehicleId: o.vehicleId,
    km: o.km,
    recordedAt: iso(o.recordedAt),
    source: o.source,
    serviceRecordId: o.serviceRecordId,
    note: o.note,
  };
}

export function toRuleDto(r: VehicleMaintenanceRule): RuleDto {
  return {
    id: r.id,
    vehicleId: r.vehicleId,
    partCode: r.partCode,
    action: r.action,
    intervalKm: r.intervalKm,
    intervalMonths: r.intervalMonths,
    resetActions: r.resetActions as ServiceAction[],
    isEnabled: r.isEnabled,
    isCustomized: r.isCustomized,
    snoozedUntil: dateOnlyToString(r.snoozedUntil),
  };
}

export function toWorkshopDto(w: Workshop & { _count?: { serviceRecords: number } }): WorkshopDto {
  return {
    id: w.id,
    garageId: w.garageId,
    name: w.name,
    type: w.type,
    certification: w.certification,
    certificationNote: w.certificationNote,
    address: w.address,
    city: w.city,
    phone: w.phone,
    latitude: decimalToNumber(w.latitude),
    longitude: decimalToNumber(w.longitude),
    notes: w.notes,
    ...(w._count ? { serviceCount: w._count.serviceRecords } : {}),
  };
}

export function partName(partCode: string | null, customPartName: string | null): string {
  if (partCode) return getPart(partCode)?.name ?? customPartName ?? partCode;
  return customPartName ?? 'Lainnya';
}

export function toServiceItemDto(i: ServiceItem): ServiceItemDto {
  return {
    id: i.id,
    partCode: i.partCode,
    partName: partName(i.partCode, i.customPartName),
    customPartName: i.customPartName,
    action: i.action,
    productName: i.productName,
    quantity: decimalToNumber(i.quantity),
    unit: i.unit,
    unitPrice: decimalToNumber(i.unitPrice),
    subtotal: decimalToNumber(i.subtotal),
    notes: i.notes,
  };
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    vehicleId: n.vehicleId,
    type: n.type,
    title: n.title,
    body: n.body,
    data: (n.data as Record<string, unknown> | null) ?? null,
    readAt: iso(n.readAt),
    createdAt: iso(n.createdAt),
  };
}
