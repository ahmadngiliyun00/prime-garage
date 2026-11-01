/** Conversions between Prisma Date values and API strings. */

/** MySQL DATE column (returned as UTC midnight) → `YYYY-MM-DD`. */
export function dateOnlyToString(value: Date): string;
export function dateOnlyToString(value: Date | null): string | null;
export function dateOnlyToString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** `YYYY-MM-DD` → Date at UTC midnight for a MySQL DATE column. */
export function stringToDateOnly(value: string): Date;
export function stringToDateOnly(value: string | null | undefined): Date | null;
export function stringToDateOnly(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function iso(value: Date): string;
export function iso(value: Date | null): string | null;
export function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function decimalToNumber(value: { toNumber(): number } | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}
