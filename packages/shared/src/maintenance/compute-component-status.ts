/**
 * Component wear estimation. Single source of truth for docs/MAINTENANCE-LOGIC.md.
 * Pure function: no I/O, "now" is always passed in.
 */
import type { ComponentStatus, ServiceAction } from '../enums.js';
import {
  addDays,
  addMonths,
  diffDays,
  minDate,
  toCalendarDate,
  type CalendarDate,
} from './calendar.js';

export const SOON_THRESHOLD = 0.8;
export const DEFAULT_AVG_DAILY_KM = 25;
export const MAX_AVG_DAILY_KM = 300;
export const ODOMETER_STALE_DAYS = 14;
export const AVG_WINDOW_DAYS = 90;
export const MIN_AVG_SPAN_DAYS = 7;
export const NEW_VEHICLE_MAX_KM = 100;

export type RuleInput = {
  ruleId: string;
  partCode: string;
  action: ServiceAction;
  intervalKm: number | null;
  intervalMonths: number | null;
  resetActions: readonly ServiceAction[];
};

export type VehicleInput = {
  initialOdometerKm: number;
  currentOdometerKm: number;
  /** Instant (Date or ISO string) of the latest odometer reading. */
  currentOdometerAt: Date | string;
  /** Calendar date `YYYY-MM-DD`. */
  purchaseDate: CalendarDate | null;
};

/** Service items for the rule's part code (other parts are ignored). */
export type ServiceHistoryItem = {
  serviceRecordId: string;
  /** Calendar date `YYYY-MM-DD`. */
  serviceDate: CalendarDate;
  odometerKm: number;
  action: ServiceAction;
  partCode?: string | null;
};

export type OdometerPoint = { km: number; recordedAt: Date | string };

export type Baseline = {
  date: CalendarDate;
  km: number;
  key: string;
  source: 'service' | 'purchase';
};

export type AvgDailySource = 'odometer_logs' | 'baseline' | 'default';

export type ComponentStatusResult = {
  ruleId: string;
  partCode: string;
  action: ServiceAction;
  status: ComponentStatus;
  remainingPercent: number | null;
  usage: number | null;
  baseline: Baseline | null;
  estimatedKm: number;
  avgDailyKm: number;
  avgDailySource: AvgDailySource;
  dueKm: number | null;
  dueDate: CalendarDate | null;
  dueReason: 'km' | 'time' | null;
  /** Days past dueDate (0 when not overdue). */
  overdueDays: number;
  /** Km past dueKm (0 when not overdue). */
  overdueKm: number;
  isOdometerStale: boolean;
  today: CalendarDate;
};

export type ComputeInput = {
  rule: RuleInput;
  vehicle: VehicleInput;
  history: readonly ServiceHistoryItem[];
  odometerLogs: readonly OdometerPoint[];
  now: Date;
  timezone: string;
};

export function findBaseline(
  rule: RuleInput,
  vehicle: VehicleInput,
  history: readonly ServiceHistoryItem[],
): Baseline | null {
  const candidates = history
    .filter((h) => (h.partCode == null || h.partCode === rule.partCode) && rule.resetActions.includes(h.action))
    .slice()
    .sort((a, b) => {
      const byDate = diffDays(b.serviceDate, a.serviceDate);
      if (byDate !== 0) return -byDate; // latest date first
      return b.odometerKm - a.odometerKm; // then highest odometer
    });

  const latest = candidates[0];
  if (latest) {
    return { date: latest.serviceDate, km: latest.odometerKm, key: latest.serviceRecordId, source: 'service' };
  }
  if (vehicle.purchaseDate && vehicle.initialOdometerKm <= NEW_VEHICLE_MAX_KM) {
    return { date: vehicle.purchaseDate, km: 0, key: 'purchase', source: 'purchase' };
  }
  return null;
}

function clampAvg(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, MAX_AVG_DAILY_KM);
}

export function computeAvgDailyKm(params: {
  odometerLogs: readonly OdometerPoint[];
  baseline: Baseline | null;
  currentOdometerKm: number;
  currentOdometerDate: CalendarDate;
  today: CalendarDate;
  timezone: string;
}): { avgDailyKm: number; source: AvgDailySource } {
  const { odometerLogs, baseline, currentOdometerKm, currentOdometerDate, today, timezone } = params;

  const windowStart = addDays(today, -AVG_WINDOW_DAYS);
  const points = odometerLogs
    .map((p) => ({ km: p.km, date: toCalendarDate(p.recordedAt, timezone) }))
    .filter((p) => diffDays(windowStart, p.date) >= 0 && diffDays(p.date, today) >= 0)
    .sort((a, b) => diffDays(b.date, a.date) || a.km - b.km);

  const first = points[0];
  const last = points[points.length - 1];
  if (first && last && points.length >= 2) {
    const span = diffDays(first.date, last.date);
    if (span >= MIN_AVG_SPAN_DAYS && last.km >= first.km) {
      return { avgDailyKm: clampAvg((last.km - first.km) / span), source: 'odometer_logs' };
    }
  }

  if (baseline) {
    const span = diffDays(baseline.date, currentOdometerDate);
    if (span >= MIN_AVG_SPAN_DAYS && currentOdometerKm >= baseline.km) {
      return { avgDailyKm: clampAvg((currentOdometerKm - baseline.km) / span), source: 'baseline' };
    }
  }

  return { avgDailyKm: DEFAULT_AVG_DAILY_KM, source: 'default' };
}

export function statusFromUsage(usage: number): ComponentStatus {
  if (usage >= 1) return 'DUE';
  if (usage >= SOON_THRESHOLD) return 'SOON';
  return 'GOOD';
}

export function computeComponentStatus(input: ComputeInput): ComponentStatusResult {
  const { rule, vehicle, history, odometerLogs, now, timezone } = input;
  if (rule.intervalKm == null && rule.intervalMonths == null) {
    throw new Error(`Rule ${rule.ruleId} has neither intervalKm nor intervalMonths`);
  }

  const today = toCalendarDate(now, timezone);
  const currentOdometerDate = toCalendarDate(vehicle.currentOdometerAt, timezone);
  const daysSinceOdometer = Math.max(0, diffDays(currentOdometerDate, today));
  const isOdometerStale = daysSinceOdometer > ODOMETER_STALE_DAYS;

  const baseline = findBaseline(rule, vehicle, history);
  const { avgDailyKm, source: avgDailySource } = computeAvgDailyKm({
    odometerLogs,
    baseline,
    currentOdometerKm: vehicle.currentOdometerKm,
    currentOdometerDate,
    today,
    timezone,
  });
  const estimatedKm = Math.round(vehicle.currentOdometerKm + avgDailyKm * daysSinceOdometer);

  const base = {
    ruleId: rule.ruleId,
    partCode: rule.partCode,
    action: rule.action,
    estimatedKm,
    avgDailyKm,
    avgDailySource,
    isOdometerStale,
    today,
  };

  if (!baseline) {
    return {
      ...base,
      status: 'NO_DATA',
      remainingPercent: null,
      usage: null,
      baseline: null,
      dueKm: null,
      dueDate: null,
      dueReason: null,
      overdueDays: 0,
      overdueKm: 0,
    };
  }

  const ratios: number[] = [];
  let dueKm: number | null = null;
  let dueByKm: CalendarDate | null = null;
  let dueByTime: CalendarDate | null = null;

  if (rule.intervalKm != null && rule.intervalKm > 0) {
    dueKm = baseline.km + rule.intervalKm;
    ratios.push((estimatedKm - baseline.km) / rule.intervalKm);
    const remainingKm = dueKm - estimatedKm;
    if (remainingKm <= 0) {
      dueByKm = avgDailyKm > 0 ? addDays(today, -Math.floor(-remainingKm / avgDailyKm)) : today;
    } else if (avgDailyKm > 0) {
      dueByKm = addDays(today, Math.ceil(remainingKm / avgDailyKm));
    }
  }

  if (rule.intervalMonths != null && rule.intervalMonths > 0) {
    dueByTime = addMonths(baseline.date, rule.intervalMonths);
    const total = diffDays(baseline.date, dueByTime);
    const elapsed = diffDays(baseline.date, today);
    ratios.push(total > 0 ? elapsed / total : 1);
  }

  const usage = Math.max(...ratios);
  const status = statusFromUsage(usage);
  const remainingPercent = Math.round(Math.min(1, Math.max(0, 1 - usage)) * 100);

  let dueDate: CalendarDate | null = null;
  let dueReason: 'km' | 'time' | null = null;
  if (dueByKm && dueByTime) {
    dueDate = minDate(dueByKm, dueByTime);
    dueReason = dueDate === dueByKm ? 'km' : 'time';
  } else if (dueByKm) {
    dueDate = dueByKm;
    dueReason = 'km';
  } else if (dueByTime) {
    dueDate = dueByTime;
    dueReason = 'time';
  }

  return {
    ...base,
    status,
    remainingPercent,
    usage,
    baseline,
    dueKm,
    dueDate,
    dueReason,
    overdueDays: dueDate ? Math.max(0, diffDays(dueDate, today)) : 0,
    overdueKm: dueKm != null ? Math.max(0, estimatedKm - dueKm) : 0,
  };
}

/** Status severity for sorting (most urgent first). */
export const STATUS_SEVERITY: Record<ComponentStatus, number> = { DUE: 3, SOON: 2, NO_DATA: 1, GOOD: 0 };

export function sortByUrgency<T extends Pick<ComponentStatusResult, 'status' | 'usage'>>(items: readonly T[]): T[] {
  return items
    .slice()
    .sort((a, b) => STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status] || (b.usage ?? 0) - (a.usage ?? 0));
}

/**
 * Worst status per part (a part can have several rules: inspect, replace, ...).
 * Used to color 3D meshes.
 */
export function worstStatusByPart<T extends ComponentStatusResult>(results: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const r of results) {
    const current = out[r.partCode];
    if (
      !current ||
      STATUS_SEVERITY[r.status] > STATUS_SEVERITY[current.status] ||
      (STATUS_SEVERITY[r.status] === STATUS_SEVERITY[current.status] && (r.usage ?? 0) > (current.usage ?? 0))
    ) {
      out[r.partCode] = r;
    }
  }
  return out;
}
