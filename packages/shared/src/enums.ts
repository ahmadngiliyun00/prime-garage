/** Domain enums shared by the app and the API. Values are stored as-is in MySQL ENUM columns. */

export const VEHICLE_KINDS = ['motorcycle', 'car'] as const;
export type VehicleKind = (typeof VEHICLE_KINDS)[number];

export const VEHICLE_CATEGORIES = [
  'underbone',
  'scooter',
  'sport',
  'trail',
  'car_hatchback',
  'car_sedan',
  'car_mpv',
  'car_suv',
  'other',
] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  underbone: 'Motor bebek',
  scooter: 'Motor matic',
  sport: 'Motor sport',
  trail: 'Motor trail',
  car_hatchback: 'Mobil hatchback',
  car_sedan: 'Mobil sedan',
  car_mpv: 'Mobil MPV',
  car_suv: 'Mobil SUV',
  other: 'Lainnya',
};

export const SERVICE_ACTIONS = [
  'replace',
  'top_up',
  'inspect',
  'adjust',
  'clean',
  'lubricate',
  'repair',
  'other',
] as const;
export type ServiceAction = (typeof SERVICE_ACTIONS)[number];

export const SERVICE_ACTION_LABELS: Record<ServiceAction, string> = {
  replace: 'Ganti',
  top_up: 'Tambah',
  inspect: 'Periksa',
  adjust: 'Setel',
  clean: 'Bersihkan',
  lubricate: 'Lumasi',
  repair: 'Perbaiki',
  other: 'Lainnya',
};

export const WORKSHOP_TYPES = ['official', 'general', 'self', 'other'] as const;
export type WorkshopType = (typeof WORKSHOP_TYPES)[number];

export const WORKSHOP_TYPE_LABELS: Record<WorkshopType, string> = {
  official: 'Resmi (dealer/AHASS)',
  general: 'Bengkel umum',
  self: 'Servis sendiri',
  other: 'Lainnya',
};

export const WORKSHOP_CERTIFICATIONS = ['certified', 'not_certified', 'unknown'] as const;
export type WorkshopCertification = (typeof WORKSHOP_CERTIFICATIONS)[number];

export const WORKSHOP_CERTIFICATION_LABELS: Record<WorkshopCertification, string> = {
  certified: 'Bersertifikat',
  not_certified: 'Tidak bersertifikat',
  unknown: 'Tidak diketahui',
};

export const PART_GROUPS = [
  'engine',
  'fuel',
  'drivetrain',
  'brake',
  'electrical',
  'suspension',
  'wheel',
  'body',
  'fluid',
] as const;
export type PartGroup = (typeof PART_GROUPS)[number];

export const COMPONENT_STATUSES = ['GOOD', 'SOON', 'DUE', 'NO_DATA'] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  GOOD: 'Baik',
  SOON: 'Segera servis',
  DUE: 'Jatuh tempo',
  NO_DATA: 'Belum ada data',
};

/** Hex colors used both in UI badges and 3D highlight. */
export const COMPONENT_STATUS_COLORS: Record<ComponentStatus | 'NEUTRAL', string> = {
  GOOD: '#16a34a',
  SOON: '#eab308',
  DUE: '#dc2626',
  NO_DATA: '#9ca3af',
  NEUTRAL: '#3b82f6',
};

export const GARAGE_ROLES = ['owner', 'editor', 'viewer'] as const;
export type GarageRole = (typeof GARAGE_ROLES)[number];

export const ODOMETER_SOURCES = ['initial', 'manual', 'service'] as const;
export type OdometerSource = (typeof ODOMETER_SOURCES)[number];

export const NOTIFICATION_TYPES = ['component_soon', 'component_due', 'odometer_stale', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PUSH_PLATFORMS = ['android', 'ios', 'web'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export const DEFAULT_TIMEZONE = 'Asia/Jakarta';
