/**
 * Reminder scheduling rules (docs/MAINTENANCE-LOGIC.md section 5). Pure helpers used by the worker.
 */
import type { ComponentStatusResult } from './compute-component-status.js';
import { isoWeekKey, type CalendarDate } from './calendar.js';
import { ODOMETER_STALE_DAYS } from './compute-component-status.js';

export const DUE_REPEAT_FIRST_DAYS = [0, 7, 14] as const;
export const DUE_REPEAT_LATER_EVERY_DAYS = 30;

/**
 * Index of the "due" reminder for a given number of days past the due date.
 * Day 0-6 → 0, 7-13 → 1, 14-43 → 2, 44-73 → 3, and so on (every 30 days after day 14).
 */
export function dueRepeatIndex(daysPastDue: number): number {
  if (daysPastDue < 0) return -1;
  if (daysPastDue < 14) return Math.floor(daysPastDue / 7);
  return 2 + Math.floor((daysPastDue - 14) / DUE_REPEAT_LATER_EVERY_DAYS);
}

export type ReminderCandidate =
  | { type: 'component_soon'; dedupeKey: string }
  | { type: 'component_due'; dedupeKey: string; repeatIndex: number };

/** Which reminder (if any) a component status should produce today. */
export function reminderForStatus(result: ComponentStatusResult): ReminderCandidate | null {
  if (!result.baseline) return null;
  if (result.status === 'SOON') {
    return { type: 'component_soon', dedupeKey: `soon:${result.ruleId}:${result.baseline.key}` };
  }
  if (result.status === 'DUE') {
    const n = Math.max(0, dueRepeatIndex(result.overdueDays));
    return { type: 'component_due', dedupeKey: `due:${result.ruleId}:${result.baseline.key}:${n}`, repeatIndex: n };
  }
  return null;
}

export function odometerStaleDedupeKey(vehicleId: string, today: CalendarDate): string {
  return `odo:${vehicleId}:${isoWeekKey(today)}`;
}

export function isOdometerStale(daysSinceLastReading: number): boolean {
  return daysSinceLastReading > ODOMETER_STALE_DAYS;
}
