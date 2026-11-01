import { Controller, Get } from '@nestjs/common';
import type { DashboardDto } from '@prime-garage/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators.js';
import { dateOnlyToString, decimalToNumber } from '../../common/dates.js';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { StorageService } from '../../common/storage.service.js';
import { toVehicleDto } from '../../common/serializers.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MaintenanceService } from '../maintenance/maintenance.service.js';

/** FR-MNT-04: most urgent components across all of the user's vehicles. */
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GarageAccessService,
    private readonly maintenance: MaintenanceService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser): Promise<DashboardDto> {
    const [profile, garageIds] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timezone: true } }),
      this.access.garageIdsForUser(user.id),
    ]);
    const vehicles = await this.prisma.vehicle.findMany({
      where: { garageId: { in: garageIds }, archivedAt: null },
      include: {
        vehicleModel: { include: { brand: true } },
        serviceRecords: {
          orderBy: [{ serviceDate: 'desc' }, { odometerKm: 'desc' }],
          take: 1,
          include: { workshop: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const items = await Promise.all(
      vehicles.map(async (v) => {
        const components = await this.maintenance.componentsForVehicle(v, profile.timezone, now);
        const counts = { due: 0, soon: 0, good: 0, noData: 0 };
        for (const c of components) {
          if (c.status === 'DUE') counts.due++;
          else if (c.status === 'SOON') counts.soon++;
          else if (c.status === 'GOOD') counts.good++;
          else counts.noData++;
        }
        const last = v.serviceRecords[0];
        return {
          vehicle: toVehicleDto(v, v.photoAttachmentId ? this.storage.signedUrl(v.photoAttachmentId) : null),
          counts,
          urgent: components.filter((c) => c.status === 'DUE' || c.status === 'SOON').slice(0, 5),
          lastService: last
            ? {
                id: last.id,
                serviceDate: dateOnlyToString(last.serviceDate),
                odometerKm: last.odometerKm,
                totalCost: decimalToNumber(last.totalCost) ?? 0,
                workshopName: last.workshop?.name ?? null,
              }
            : null,
        };
      }),
    );
    return { vehicles: items };
  }
}
