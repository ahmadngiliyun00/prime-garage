/** Request payload schemas, validated on the client (forms) and on the server (pipes). */
import { z } from 'zod';
import {
  PUSH_PLATFORMS,
  SERVICE_ACTIONS,
  VEHICLE_CATEGORIES,
  VEHICLE_KINDS,
  WORKSHOP_CERTIFICATIONS,
  WORKSHOP_TYPES,
} from '../enums.js';
import { isCalendarDate } from '../maintenance/calendar.js';

const MAX_KM = 2_000_000;

export const calendarDateSchema = z
  .string()
  .refine((v) => isCalendarDate(v) && !Number.isNaN(Date.parse(v)), 'Format tanggal harus YYYY-MM-DD');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v == null || v === '' ? null : v));

const kmSchema = z.coerce.number().int('Harus bilangan bulat').min(0, 'Tidak boleh negatif').max(MAX_KM);
const moneySchema = z.coerce.number().min(0).max(9_999_999_999);

// ---------- Auth ----------
export const googleLoginSchema = z.object({
  idToken: z.string().min(10),
});
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

/** Lowercase login name: letters, digits, dot, dash, underscore. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,50}$/, 'Username 3 sampai 50 karakter: huruf, angka, titik, strip, atau garis bawah');

export const passwordLoginSchema = z.object({
  /** Username or email address. */
  username: z.string().trim().toLowerCase().min(1, 'Username wajib diisi').max(191),
  password: z.string().min(1, 'Password wajib diisi').max(200),
});
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;

export const githubExchangeSchema = z.object({
  /** One-time code the API put on the return URL after the GitHub callback. */
  code: z.string().min(20).max(200),
});
export type GithubExchangeInput = z.infer<typeof githubExchangeSchema>;

export const devLoginSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(120),
});
export type DevLoginInput = z.infer<typeof devLoginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timezone: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Zona waktu tidak dikenal')
    .optional(),
  notifyPush: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const registerPushTokenSchema = z.object({
  token: z.string().min(10).max(255),
  platform: z.enum(PUSH_PLATFORMS),
  deviceName: optionalText(120),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

// ---------- Vehicles ----------
const vehicleBaseSchema = z.object({
  nickname: z.string().trim().min(1, 'Nama panggilan wajib diisi').max(60),
  plateNumber: optionalText(20),
  year: z.coerce.number().int().min(1950).max(2100).nullish(),
  color: optionalText(40),
  engineCc: z.coerce.number().int().min(1).max(10000).nullish(),
  frameNumber: optionalText(40),
  engineNumber: optionalText(40),
  purchaseDate: calendarDateSchema.nullish(),
});

export const createVehicleSchema = vehicleBaseSchema
  .extend({
    garageId: z.uuid().optional(),
    vehicleModelId: z.coerce.number().int().positive().nullish(),
    kind: z.enum(VEHICLE_KINDS).default('motorcycle'),
    category: z.enum(VEHICLE_CATEGORIES).optional(),
    customBrand: optionalText(64),
    customModel: optionalText(100),
    initialOdometerKm: kmSchema,
  })
  .refine((v) => v.vehicleModelId != null || (v.customModel != null && v.category != null), {
    message: 'Pilih model dari katalog, atau isi nama model dan kategori secara manual',
    path: ['vehicleModelId'],
  });
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = vehicleBaseSchema.partial().extend({
  customBrand: optionalText(64),
  customModel: optionalText(100),
  category: z.enum(VEHICLE_CATEGORIES).optional(),
});
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const archiveVehicleSchema = z.object({ archived: z.boolean() });

export const createOdometerSchema = z.object({
  km: kmSchema,
  recordedAt: z.iso.datetime({ offset: true }).optional(),
  note: optionalText(255),
  /** Must be true to save a reading lower than the latest one (e.g. speedometer replaced). */
  confirmDecrease: z.boolean().optional(),
});
export type CreateOdometerInput = z.infer<typeof createOdometerSchema>;

// ---------- Rules ----------
export const updateRuleSchema = z
  .object({
    intervalKm: z.coerce.number().int().min(1).max(MAX_KM).nullable().optional(),
    intervalMonths: z.coerce.number().int().min(1).max(240).nullable().optional(),
    isEnabled: z.boolean().optional(),
    snoozedUntil: calendarDateSchema.nullable().optional(),
  })
  .refine((v) => !(v.intervalKm === null && v.intervalMonths === null), {
    message: 'Minimal salah satu interval (km atau bulan) harus diisi',
    path: ['intervalKm'],
  });
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

// ---------- Workshops ----------
export const workshopSchema = z.object({
  garageId: z.uuid().optional(),
  name: z.string().trim().min(1, 'Nama bengkel wajib diisi').max(120),
  type: z.enum(WORKSHOP_TYPES).default('general'),
  certification: z.enum(WORKSHOP_CERTIFICATIONS).default('unknown'),
  certificationNote: optionalText(255),
  address: optionalText(255),
  city: optionalText(100),
  phone: optionalText(30),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
  notes: optionalText(2000),
});
export type WorkshopInput = z.infer<typeof workshopSchema>;
export const updateWorkshopSchema = workshopSchema.partial();
export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;

// ---------- Services ----------
export const serviceItemSchema = z
  .object({
    partCode: z.string().max(64).nullish(),
    customPartName: optionalText(100),
    action: z.enum(SERVICE_ACTIONS),
    productName: optionalText(120),
    quantity: z.coerce.number().min(0).max(100000).nullish(),
    unit: optionalText(20),
    unitPrice: moneySchema.nullish(),
    subtotal: moneySchema.nullish(),
    notes: optionalText(255),
  })
  .refine((v) => (v.partCode != null && v.partCode !== '') || v.customPartName != null, {
    message: 'Pilih bagian atau tulis nama bagian',
    path: ['partCode'],
  });
export type ServiceItemInput = z.infer<typeof serviceItemSchema>;

export const serviceRecordSchema = z.object({
  serviceDate: calendarDateSchema,
  odometerKm: kmSchema,
  workshopId: z.uuid().nullish(),
  mechanicName: optionalText(100),
  laborCost: moneySchema.nullish(),
  notes: optionalText(5000),
  items: z.array(serviceItemSchema).min(1, 'Minimal satu pekerjaan').max(50),
});
export type ServiceRecordInput = z.infer<typeof serviceRecordSchema>;

/** Subtotal of an item: explicit subtotal, else quantity x unit price, else 0. */
export function itemSubtotal(item: Pick<ServiceItemInput, 'subtotal' | 'quantity' | 'unitPrice'>): number {
  if (item.subtotal != null) return item.subtotal;
  if (item.quantity != null && item.unitPrice != null) return Math.round(item.quantity * item.unitPrice * 100) / 100;
  return 0;
}

export function serviceTotal(input: Pick<ServiceRecordInput, 'items' | 'laborCost'>): number {
  const items = input.items.reduce((sum, it) => sum + itemSubtotal(it), 0);
  return Math.round((items + (input.laborCost ?? 0)) * 100) / 100;
}

export const ATTACHMENT_OWNER_TYPES = ['service_record', 'vehicle'] as const;
export const attachmentUploadSchema = z.object({
  ownerType: z.enum(ATTACHMENT_OWNER_TYPES),
  ownerId: z.uuid(),
});
export type AttachmentUploadInput = z.infer<typeof attachmentUploadSchema>;
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
