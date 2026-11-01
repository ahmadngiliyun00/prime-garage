import { Injectable } from '@nestjs/common';
import {
  computeComponentStatus,
  getPart,
  sortByUrgency,
  toCalendarDate,
  type ComponentStatusDto,
  type ServiceAction,
  type ServiceHistoryItem,
} from '@prime-garage/shared';
import { dateOnlyToString } from '../../common/dates.js';
import type { Vehicle, VehicleMaintenanceRule } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type VehicleStatusInput = Pick<
  Vehicle,
  'id' | 'initialOdometerKm' | 'currentOdometerKm' | 'currentOdometerAt' | 'purchaseDate'
>;

/** Loads data from MySQL and delegates the math to @prime-garage/shared (single source of truth). */
@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async componentsForVehicle(
    vehicle: VehicleStatusInput,
    timezone: string,
    now: Date = new Date(),
    opts: { includeDisabled?: boolean } = {},
  ): Promise<ComponentStatusDto[]> {
    const [rules, items, logs] = await Promise.all([
      this.prisma.vehicleMaintenanceRule.findMany({
        where: { vehicleId: vehicle.id, ...(opts.includeDisabled ? {} : { isEnabled: true }) },
      }),
      this.prisma.serviceItem.findMany({
        where: { serviceRecord: { vehicleId: vehicle.id }, partCode: { not: null } },
        select: {
          partCode: true,
          action: true,
          serviceRecord: { select: { id: true, serviceDate: true, odometerKm: true } },
        },
      }),
      this.prisma.odometerLog.findMany({
        where: { vehicleId: vehicle.id, recordedAt: { gte: new Date(now.getTime() - 120 * 86_400_000) } },
        select: { km: true, recordedAt: true },
      }),
    ]);

    const history: ServiceHistoryItem[] = items.map((i) => ({
      serviceRecordId: i.serviceRecord.id,
      serviceDate: dateOnlyToString(i.serviceRecord.serviceDate),
      odometerKm: i.serviceRecord.odometerKm,
      action: i.action as ServiceAction,
      partCode: i.partCode,
    }));

    return this.compute(vehicle, rules, history, logs, timezone, now);
  }

  compute(
    vehicle: VehicleStatusInput,
    rules: VehicleMaintenanceRule[],
    history: ServiceHistoryItem[],
    logs: { km: number; recordedAt: Date }[],
    timezone: string,
    now: Date,
  ): ComponentStatusDto[] {
    const results = rules
      .filter((r) => r.intervalKm != null || r.intervalMonths != null)
      .map((rule) => {
        const result = computeComponentStatus({
          rule: {
            ruleId: rule.id,
            partCode: rule.partCode,
            action: rule.action as ServiceAction,
            intervalKm: rule.intervalKm,
            intervalMonths: rule.intervalMonths,
            resetActions: rule.resetActions as ServiceAction[],
          },
          vehicle: {
            initialOdometerKm: vehicle.initialOdometerKm,
            currentOdometerKm: vehicle.currentOdometerKm,
            currentOdometerAt: vehicle.currentOdometerAt,
            purchaseDate: dateOnlyToString(vehicle.purchaseDate),
          },
          history: history.filter((h) => h.partCode === rule.partCode),
          odometerLogs: logs,
          now,
          timezone,
        });
        return {
          ...result,
          partName: getPart(rule.partCode)?.name ?? rule.partCode,
          intervalKm: rule.intervalKm,
          intervalMonths: rule.intervalMonths,
          isEnabled: rule.isEnabled,
          snoozedUntil: dateOnlyToString(rule.snoozedUntil),
        };
      });
    return sortByUrgency(results);
  }

  /** True when the rule is snoozed on the given calendar day. */
  static isSnoozed(snoozedUntil: string | null, today: string): boolean {
    return snoozedUntil != null && snoozedUntil >= today;
  }

  static todayIn(timezone: string, now = new Date()): string {
    return toCalendarDate(now, timezone);
  }
}
