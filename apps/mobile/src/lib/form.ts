import type { ZodType } from 'zod';
import { ApiError } from './api';

export type FieldErrors = Record<string, string>;

/** Validates with a shared zod schema and returns either data or field errors keyed by path. */
export function validate<T>(schema: ZodType<T>, value: unknown): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const r = schema.safeParse(value);
  if (r.success) return { data: r.data, errors: null };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.');
    errors[key] ??= issue.message;
  }
  return { data: null, errors };
}

/** Field errors returned by the API (400 responses). */
export function apiFieldErrors(e: unknown): FieldErrors {
  if (!(e instanceof ApiError) || !e.body.errors) return {};
  return Object.fromEntries(e.body.errors.map((x) => [x.path, x.message]));
}

/** Empty string → null, otherwise number (for optional numeric inputs). */
export function numOrNull(v: string): number | null {
  const t = v.replace(/\./g, '').replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
