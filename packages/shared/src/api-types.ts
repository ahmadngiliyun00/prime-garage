/** Response shapes returned by the REST API (JSON, dates as ISO strings). */
import type {
  GarageRole,
  NotificationType,
  OdometerSource,
  PartGroup,
  ServiceAction,
  VehicleCategory,
  VehicleKind,
  WorkshopCertification,
  WorkshopType,
} from './enums.js';
import type { ComponentStatusResult } from './maintenance/compute-component-status.js';
import type { PartView, Vec3 } from './catalog/model-views.js';

export type UserDto = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  notifyPush: boolean;
  notifyEmail: boolean;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  /** Only returned to native clients; web receives an httpOnly cookie instead. */
  refreshToken?: string;
  accessTokenExpiresAt: string;
  user: UserDto;
};

export type GarageDto = { id: string; name: string; role: GarageRole; ownerId: string };

export type BrandDto = { id: number; slug: string; name: string };

export type VehicleModelDto = {
  id: number;
  brandId: number;
  brandName: string;
  name: string;
  slug: string;
  kind: VehicleKind;
  category: VehicleCategory;
  engineCc: number | null;
  model3dKey: string;
  yearStart: number | null;
  yearEnd: number | null;
};

export type PartDto = {
  code: string;
  name: string;
  nameEn: string;
  group: PartGroup;
  appliesTo: VehicleCategory[];
  summary: string;
  functionText: string;
  symptomsText: string;
  careTipsText: string;
  tourOrder: number | null;
  sortOrder: number;
};

export type Model3dDto = {
  key: string;
  category: VehicleCategory;
  version: number;
  defaultCamera: { position: Vec3; target: Vec3 };
  partViews: PartView[];
};

export type VehicleDto = {
  id: string;
  garageId: string;
  vehicleModelId: number | null;
  kind: VehicleKind;
  category: VehicleCategory;
  brandName: string | null;
  modelName: string | null;
  displayName: string;
  nickname: string;
  plateNumber: string | null;
  year: number | null;
  color: string | null;
  engineCc: number | null;
  frameNumber: string | null;
  engineNumber: string | null;
  purchaseDate: string | null;
  initialOdometerKm: number;
  currentOdometerKm: number;
  currentOdometerAt: string;
  model3dKey: string;
  photoUrl: string | null;
  eduTourCompletedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OdometerLogDto = {
  id: string;
  vehicleId: string;
  km: number;
  recordedAt: string;
  source: OdometerSource;
  serviceRecordId: string | null;
  note: string | null;
};

export type RuleDto = {
  id: string;
  vehicleId: string;
  partCode: string;
  action: ServiceAction;
  intervalKm: number | null;
  intervalMonths: number | null;
  resetActions: ServiceAction[];
  isEnabled: boolean;
  isCustomized: boolean;
  snoozedUntil: string | null;
};

export type ComponentStatusDto = ComponentStatusResult & {
  partName: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  isEnabled: boolean;
  snoozedUntil: string | null;
};

export type WorkshopDto = {
  id: string;
  garageId: string;
  name: string;
  type: WorkshopType;
  certification: WorkshopCertification;
  certificationNote: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  serviceCount?: number;
};

export type AttachmentDto = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  url: string;
  createdAt: string;
};

export type ServiceItemDto = {
  id: string;
  partCode: string | null;
  partName: string;
  customPartName: string | null;
  action: ServiceAction;
  productName: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  subtotal: number | null;
  notes: string | null;
};

export type ServiceRecordDto = {
  id: string;
  vehicleId: string;
  workshop: Pick<WorkshopDto, 'id' | 'name' | 'type' | 'certification'> | null;
  serviceDate: string;
  odometerKm: number;
  mechanicName: string | null;
  laborCost: number | null;
  totalCost: number;
  notes: string | null;
  items: ServiceItemDto[];
  attachments: AttachmentDto[];
  createdAt: string;
  updatedAt: string;
};

export type DashboardVehicleDto = {
  vehicle: VehicleDto;
  counts: { due: number; soon: number; good: number; noData: number };
  urgent: ComponentStatusDto[];
  lastService: Pick<ServiceRecordDto, 'id' | 'serviceDate' | 'odometerKm' | 'totalCost'> & { workshopName: string | null } | null;
};

export type DashboardDto = { vehicles: DashboardVehicleDto[] };

export type NotificationDto = {
  id: string;
  vehicleId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type Paginated<T> = { items: T[]; nextCursor: string | null };

export type ApiErrorBody = {
  statusCode: number;
  message: string;
  errors?: { path: string; message: string }[];
};
