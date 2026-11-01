import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PARTS,
  type BrandDto,
  type ComponentStatusDto,
  type CreateOdometerInput,
  type CreateVehicleInput,
  type DashboardDto,
  type Model3dDto,
  type NotificationDto,
  type OdometerLogDto,
  type Paginated,
  type PartDto,
  type RuleDto,
  type ServiceRecordDto,
  type ServiceRecordInput,
  type UpdateRuleInput,
  type UpdateVehicleInput,
  type VehicleDto,
  type VehicleModelDto,
  type WorkshopDto,
  type WorkshopInput,
} from '@prime-garage/shared';
import { http } from './api';
import { qk } from './query-client';

// ---------- Queries ----------
export const useDashboard = () => useQuery({ queryKey: qk.dashboard, queryFn: () => http.get<DashboardDto>('/dashboard') });
export const useVehicles = () => useQuery({ queryKey: qk.vehicles, queryFn: () => http.get<VehicleDto[]>('/vehicles') });
export const useVehicle = (id: string) =>
  useQuery({ queryKey: qk.vehicle(id), queryFn: () => http.get<VehicleDto>(`/vehicles/${id}`), enabled: !!id });
export const useComponents = (id: string) =>
  useQuery({
    queryKey: qk.components(id),
    queryFn: () => http.get<ComponentStatusDto[]>(`/vehicles/${id}/components`),
    enabled: !!id,
  });
export const useRules = (id: string) =>
  useQuery({ queryKey: qk.rules(id), queryFn: () => http.get<RuleDto[]>(`/vehicles/${id}/rules`), enabled: !!id });
export const useOdometer = (id: string) =>
  useQuery({ queryKey: qk.odometer(id), queryFn: () => http.get<OdometerLogDto[]>(`/vehicles/${id}/odometer`), enabled: !!id });
export const useServices = (id: string, partCode?: string) =>
  useQuery({
    queryKey: qk.services(id, partCode),
    queryFn: () => http.get<ServiceRecordDto[]>(`/vehicles/${id}/services${partCode ? `?partCode=${partCode}` : ''}`),
    enabled: !!id,
  });
export const useService = (id: string) =>
  useQuery({ queryKey: qk.service(id), queryFn: () => http.get<ServiceRecordDto>(`/services/${id}`), enabled: !!id });
export const useWorkshops = () => useQuery({ queryKey: qk.workshops, queryFn: () => http.get<WorkshopDto[]>('/workshops') });
export const useWorkshop = (id: string) =>
  useQuery({ queryKey: qk.workshop(id), queryFn: () => http.get<WorkshopDto>(`/workshops/${id}`), enabled: !!id });
export const useBrands = () =>
  useQuery({ queryKey: qk.brands, queryFn: () => http.get<BrandDto[]>('/catalog/brands'), staleTime: 3_600_000 });
export const useModels = () =>
  useQuery({ queryKey: qk.models, queryFn: () => http.get<VehicleModelDto[]>('/catalog/models'), staleTime: 3_600_000 });

/** Education content from the database (FR-EDU-02), bundled catalog as offline fallback. */
export const useParts = () =>
  useQuery({
    queryKey: qk.parts,
    queryFn: () => http.get<PartDto[]>('/catalog/parts'),
    staleTime: 3_600_000,
    placeholderData: PARTS as PartDto[],
  });
export const useModel3d = (key: string) =>
  useQuery({ queryKey: qk.model3d(key), queryFn: () => http.get<Model3dDto>(`/catalog/models3d/${key}`), staleTime: 3_600_000 });
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => http.get<Paginated<NotificationDto>>('/notifications') });
export const useUnreadCount = () =>
  useQuery({ queryKey: qk.unread, queryFn: () => http.get<{ count: number }>('/notifications/unread-count') });

// ---------- Mutations ----------
function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useCreateVehicle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => http.post<VehicleDto>('/vehicles', input),
    onSuccess: () => invalidate(qk.vehicles, qk.dashboard),
  });
}

export function useUpdateVehicle(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateVehicleInput) => http.patch<VehicleDto>(`/vehicles/${id}`, input),
    onSuccess: () => invalidate(qk.vehicles, qk.dashboard),
  });
}

export function useArchiveVehicle(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (archived: boolean) => http.post<VehicleDto>(`/vehicles/${id}/archive`, { archived }),
    onSuccess: () => invalidate(qk.vehicles, qk.dashboard),
  });
}

export function useDeleteVehicle(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => http.delete(`/vehicles/${id}`),
    onSuccess: () => invalidate(qk.vehicles, qk.dashboard),
  });
}

export function useCompleteTour(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => http.post<VehicleDto>(`/vehicles/${id}/tour-complete`),
    onSuccess: () => invalidate(qk.vehicle(id)),
  });
}

export function useAddOdometer(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateOdometerInput) => http.post<OdometerLogDto>(`/vehicles/${id}/odometer`, input),
    onSuccess: () => invalidate(qk.vehicle(id), qk.vehicles, qk.dashboard),
  });
}

export function useDeleteOdometer(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (logId: string) => http.delete(`/vehicles/${id}/odometer/${logId}`),
    onSuccess: () => invalidate(qk.vehicle(id), qk.vehicles, qk.dashboard),
  });
}

export function useUpdateRule(vehicleId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ ruleId, input }: { ruleId: string; input: UpdateRuleInput }) =>
      http.patch<RuleDto>(`/vehicles/${vehicleId}/rules/${ruleId}`, input),
    onSuccess: () => invalidate(qk.rules(vehicleId), qk.components(vehicleId), qk.dashboard),
  });
}

export function useResetRule(vehicleId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (ruleId: string) => http.post<RuleDto>(`/vehicles/${vehicleId}/rules/${ruleId}/reset`),
    onSuccess: () => invalidate(qk.rules(vehicleId), qk.components(vehicleId), qk.dashboard),
  });
}

export function useSaveService(vehicleId: string, serviceId?: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ServiceRecordInput) =>
      serviceId
        ? http.put<ServiceRecordDto>(`/services/${serviceId}`, input)
        : http.post<ServiceRecordDto>(`/vehicles/${vehicleId}/services`, input),
    onSuccess: () => invalidate(['vehicles', vehicleId], qk.dashboard, qk.workshops, ['services']),
  });
}

export function useDeleteService(vehicleId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (serviceId: string) => http.delete(`/services/${serviceId}`),
    onSuccess: () => invalidate(['vehicles', vehicleId], qk.dashboard, qk.workshops),
  });
}

export function useSaveWorkshop(id?: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: WorkshopInput) =>
      id ? http.patch<WorkshopDto>(`/workshops/${id}`, input) : http.post<WorkshopDto>('/workshops', input),
    onSuccess: () => invalidate(qk.workshops),
  });
}

export function useDeleteWorkshop() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => http.delete(`/workshops/${id}`),
    onSuccess: () => invalidate(qk.workshops, ['services'], ['vehicles']),
  });
}

export function useMarkRead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id?: string) => (id ? http.post(`/notifications/${id}/read`) : http.post('/notifications/read-all')),
    onSuccess: () => invalidate(qk.notifications),
  });
}
