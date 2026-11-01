import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});

export const qk = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  vehicles: ['vehicles'] as const,
  vehicle: (id: string) => ['vehicles', id] as const,
  components: (id: string) => ['vehicles', id, 'components'] as const,
  rules: (id: string) => ['vehicles', id, 'rules'] as const,
  odometer: (id: string) => ['vehicles', id, 'odometer'] as const,
  services: (id: string, partCode?: string) => ['vehicles', id, 'services', partCode ?? 'all'] as const,
  service: (id: string) => ['services', id] as const,
  workshops: ['workshops'] as const,
  workshop: (id: string) => ['workshops', id] as const,
  brands: ['catalog', 'brands'] as const,
  models: ['catalog', 'models'] as const,
  parts: ['catalog', 'parts'] as const,
  model3d: (key: string) => ['catalog', 'models3d', key] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
};
