import { describe, expect, it } from 'vitest';
import {
  computeComponentStatus,
  type ComputeInput,
  type RuleInput,
  type VehicleInput,
} from './compute-component-status.js';
import { addMonths, isoWeekKey } from './calendar.js';
import { dueRepeatIndex, reminderForStatus } from './reminders.js';

const TZ = 'Asia/Jakarta';
// 1 March 2026 09:00 WIB
const NOW = new Date('2026-03-01T02:00:00Z');

const oilRule: RuleInput = {
  ruleId: 'rule-oil',
  partCode: 'engine_oil',
  action: 'replace',
  intervalKm: 2000,
  intervalMonths: 3,
  resetActions: ['replace'],
};

const vehicle: VehicleInput = {
  initialOdometerKm: 14000,
  currentOdometerKm: 16200,
  currentOdometerAt: '2026-02-25T03:00:00Z',
  purchaseDate: null,
};

function input(overrides: Partial<ComputeInput> = {}): ComputeInput {
  return {
    rule: oilRule,
    vehicle,
    history: [{ serviceRecordId: 'svc-jan', serviceDate: '2026-01-10', odometerKm: 15000, action: 'replace' }],
    odometerLogs: [
      { km: 15450, recordedAt: '2026-01-26T03:00:00Z' },
      { km: 16200, recordedAt: '2026-02-25T03:00:00Z' },
    ],
    now: NOW,
    timezone: TZ,
    ...overrides,
  };
}

describe('computeComponentStatus', () => {
  it('1. reproduces the documented example', () => {
    const r = computeComponentStatus(input());
    expect(r.avgDailyKm).toBe(25);
    expect(r.avgDailySource).toBe('odometer_logs');
    expect(r.estimatedKm).toBe(16300);
    expect(r.usage).toBeCloseTo(0.65, 5);
    expect(r.status).toBe('GOOD');
    expect(r.remainingPercent).toBe(35);
    expect(r.dueKm).toBe(17000);
    expect(r.dueDate).toBe('2026-03-29');
    expect(r.dueReason).toBe('km');
    expect(r.baseline).toEqual({ date: '2026-01-10', km: 15000, key: 'svc-jan', source: 'service' });
  });

  it('2. month-only rule ignores km', () => {
    const r = computeComponentStatus(
      input({
        rule: { ...oilRule, ruleId: 'bat', partCode: 'battery', intervalKm: null, intervalMonths: 24 },
        history: [{ serviceRecordId: 's', serviceDate: '2025-03-01', odometerKm: 1000, action: 'replace' }],
      }),
    );
    expect(r.dueKm).toBeNull();
    expect(r.dueReason).toBe('time');
    expect(r.dueDate).toBe('2027-03-01');
    expect(r.usage).toBeCloseTo(365 / 730, 5);
    expect(r.status).toBe('GOOD');
  });

  it('3. km-only rule ignores time', () => {
    const r = computeComponentStatus(
      input({
        rule: { ...oilRule, ruleId: 'chain', partCode: 'drive_chain', intervalKm: 20000, intervalMonths: null },
        history: [{ serviceRecordId: 's', serviceDate: '2020-01-01', odometerKm: 0, action: 'replace' }],
      }),
    );
    expect(r.dueReason).toBe('km');
    expect(r.usage).toBeCloseTo(16300 / 20000, 5);
    expect(r.status).toBe('SOON');
  });

  it('4. no history and not a new vehicle gives NO_DATA', () => {
    const r = computeComponentStatus(input({ history: [] }));
    expect(r.status).toBe('NO_DATA');
    expect(r.baseline).toBeNull();
    expect(r.remainingPercent).toBeNull();
    expect(reminderForStatus(r)).toBeNull();
  });

  it('5. new vehicle without history uses purchase date as baseline', () => {
    const r = computeComponentStatus(
      input({
        history: [],
        vehicle: { ...vehicle, initialOdometerKm: 5, currentOdometerKm: 600, purchaseDate: '2026-02-01' },
        odometerLogs: [],
      }),
    );
    expect(r.baseline).toEqual({ date: '2026-02-01', km: 0, key: 'purchase', source: 'purchase' });
    expect(r.status).not.toBe('NO_DATA');
  });

  it('6. top_up resets inspect rule but not replace rule', () => {
    const history = [
      { serviceRecordId: 'old', serviceDate: '2024-01-01', odometerKm: 5000, action: 'replace' as const },
      { serviceRecordId: 'topup', serviceDate: '2026-02-20', odometerKm: 16100, action: 'top_up' as const },
    ];
    const replace = computeComponentStatus(
      input({
        rule: { ruleId: 'bf-r', partCode: 'brake_fluid', action: 'replace', intervalKm: null, intervalMonths: 24, resetActions: ['replace'] },
        history,
      }),
    );
    const inspect = computeComponentStatus(
      input({
        rule: {
          ruleId: 'bf-i',
          partCode: 'brake_fluid',
          action: 'inspect',
          intervalKm: 4000,
          intervalMonths: 4,
          resetActions: ['inspect', 'top_up', 'replace'],
        },
        history,
      }),
    );
    expect(replace.baseline?.key).toBe('old');
    expect(replace.status).toBe('DUE');
    expect(inspect.baseline?.key).toBe('topup');
    expect(inspect.status).toBe('GOOD');
  });

  it('7. usage exactly 0.8 is SOON and exactly 1.0 is DUE', () => {
    const base = {
      rule: { ...oilRule, intervalKm: 1000, intervalMonths: null },
      odometerLogs: [],
      vehicle: { ...vehicle, currentOdometerAt: NOW, currentOdometerKm: 15800 },
    };
    expect(computeComponentStatus(input(base)).status).toBe('SOON');
    expect(computeComponentStatus(input(base)).usage).toBe(0.8);
    const due = computeComponentStatus(input({ ...base, vehicle: { ...base.vehicle, currentOdometerKm: 16000 } }));
    expect(due.usage).toBe(1);
    expect(due.status).toBe('DUE');
  });

  it('8. stale odometer is projected with the average', () => {
    const r = computeComponentStatus(input({ now: new Date('2026-03-17T02:00:00Z') }));
    expect(r.isOdometerStale).toBe(true);
    expect(r.estimatedKm).toBe(16200 + 25 * 20);
  });

  it('9. two services on the same day use the highest odometer', () => {
    const r = computeComponentStatus(
      input({
        history: [
          { serviceRecordId: 'a', serviceDate: '2026-01-10', odometerKm: 15000, action: 'replace' },
          { serviceRecordId: 'b', serviceDate: '2026-01-10', odometerKm: 15020, action: 'replace' },
        ],
      }),
    );
    expect(r.baseline?.key).toBe('b');
  });

  it('10. month arithmetic clamps to the end of the month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('owner example: service 10 Jan 2026 with 3 months interval is due by 10 Apr 2026 when km stays low', () => {
    const r = computeComponentStatus(
      input({
        vehicle: { ...vehicle, currentOdometerKm: 15100, currentOdometerAt: NOW },
        odometerLogs: [
          { km: 15050, recordedAt: '2026-01-20T03:00:00Z' },
          { km: 15100, recordedAt: '2026-03-01T01:00:00Z' },
        ],
      }),
    );
    expect(r.dueDate).toBe('2026-04-10');
    expect(r.dueReason).toBe('time');
  });

  it('overdue values are reported', () => {
    const r = computeComponentStatus(input({ now: new Date('2026-04-20T02:00:00Z') }));
    expect(r.status).toBe('DUE');
    expect(r.overdueDays).toBeGreaterThan(0);
    expect(r.overdueKm).toBeGreaterThan(0);
    expect(reminderForStatus(r)?.type).toBe('component_due');
  });
});

describe('reminders', () => {
  it('due repeat index follows day 0, 7, 14, then every 30 days', () => {
    expect([0, 6, 7, 13, 14, 43, 44, 73, 74].map(dueRepeatIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it('iso week key', () => {
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01');
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
    expect(isoWeekKey('2026-03-01')).toBe('2026-W09');
  });
});
