import { Platform } from 'react-native';
import type { ApiErrorBody, AuthResponse } from '@prime-garage/shared';
import { API_URL } from './config';
import { tokenStorage } from './token-storage';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Partial<ApiErrorBody> & { code?: string } = {},
  ) {
    super(message);
  }

  fieldError(path: string): string | undefined {
    return this.body.errors?.find((e) => e.path === path)?.message;
  }
}

type SessionListener = (session: AuthResponse | null) => void;

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse | null> | null = null;
const listeners = new Set<SessionListener>();

export function onSessionChange(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function applySession(session: AuthResponse | null): Promise<void> {
  accessToken = session?.accessToken ?? null;
  if (session?.refreshToken) await tokenStorage.set(session.refreshToken);
  if (!session) await tokenStorage.clear();
  listeners.forEach((l) => l(session));
}

const clientHeaders: Record<string, string> = Platform.OS === 'web' ? {} : { 'x-client': 'native' };

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...clientHeaders,
      ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = (body ?? {}) as Partial<ApiErrorBody> & { code?: string };
    throw new ApiError(res.status, err.message ?? `Permintaan gagal (${res.status})`, err);
  }
  return body as T;
}

/** Refreshes the session once even if many requests hit 401 at the same time. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await tokenStorage.get();
      if (Platform.OS !== 'web' && !refreshToken) return null;
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...clientHeaders, 'content-type': 'application/json' },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      if (!res.ok) {
        await applySession(null);
        return null;
      }
      const session = (await res.json()) as AuthResponse;
      await applySession(session);
      return session;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, init);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) res = await rawFetch(path, init);
  }
  return parse<T>(res);
}

export const http = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = void>(path: string) => api<T>(path, { method: 'DELETE' }),
};

/** Absolute URL for API-relative paths such as signed attachment URLs. */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message.includes('fetch') ? 'Tidak dapat terhubung ke server' : e.message;
  return 'Terjadi kesalahan';
}
