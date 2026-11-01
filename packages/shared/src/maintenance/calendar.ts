/**
 * Calendar-date helpers working on `YYYY-MM-DD` strings.
 * All arithmetic is done on UTC day numbers so results never depend on the
 * timezone of the machine running the code.
 */

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarDate = string;

function parts(date: CalendarDate): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid calendar date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

export function isCalendarDate(value: string): boolean {
  return DATE_RE.test(value);
}

/** Days since 1970-01-01 for a calendar date. */
export function toDayNumber(date: CalendarDate): number {
  const [y, m, d] = parts(date);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(day: number): CalendarDate {
  const dt = new Date(day * DAY_MS);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: CalendarDate, to: CalendarDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/**
 * Adds calendar months, clamping to the last day of the target month
 * (same behaviour as date-fns `addMonths`): 2026-01-31 + 1 month = 2026-02-28.
 */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const [y, m, d] = parts(date);
  const totalMonths = y * 12 + (m - 1) + months;
  const ty = Math.floor(totalMonths / 12);
  const tm = totalMonths - ty * 12; // 0-based
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${pad(ty, 4)}-${pad(tm + 1)}-${pad(Math.min(d, lastDay))}`;
}

/** Calendar date of an instant as seen in an IANA timezone. */
export function toCalendarDate(instant: Date | string, timeZone: string): CalendarDate {
  if (typeof instant === 'string' && isCalendarDate(instant)) return instant;
  const dt = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(dt.getTime())) throw new Error(`Invalid date: ${String(instant)}`);
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
}

export function minDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return toDayNumber(a) <= toDayNumber(b) ? a : b;
}

/** ISO week key like `2026-W09`, used for weekly dedupe keys. */
export function isoWeekKey(date: CalendarDate): string {
  const day = toDayNumber(date);
  const weekday = (new Date(day * DAY_MS).getUTCDay() + 6) % 7; // Monday = 0
  const thursday = day - weekday + 3;
  const year = new Date(thursday * DAY_MS).getUTCFullYear();
  const jan1 = toDayNumber(`${pad(year, 4)}-01-01`);
  const week = Math.floor((thursday - jan1) / 7) + 1;
  return `${year}-W${pad(week)}`;
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** `2026-01-10` → `10 Jan 2026` (Indonesian short month). */
export function formatDateId(date: CalendarDate): string {
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS_ID[m - 1] ?? ''} ${y}`;
}
