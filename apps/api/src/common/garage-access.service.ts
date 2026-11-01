import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { GarageRole } from '@prime-garage/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const ROLE_RANK: Record<GarageRole, number> = { viewer: 1, editor: 2, owner: 3 };

/**
 * Authorization by garage membership (docs/DATABASE.md section 4).
 * Non-members get 404 so the existence of data never leaks.
 */
@Injectable()
export class GarageAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertGarage(userId: string, garageId: string, minRole: GarageRole = 'viewer'): Promise<GarageRole> {
    const member = await this.prisma.garageMember.findUnique({
      where: { garageId_userId: { garageId, userId } },
      select: { role: true },
    });
    if (!member) throw new NotFoundException('Garasi tidak ditemukan');
    if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException('Kamu tidak punya izin untuk aksi ini');
    }
    return member.role;
  }

  async garageIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.garageMember.findMany({ where: { userId }, select: { garageId: true } });
    return rows.map((r) => r.garageId);
  }

  /** Default garage for new records: the user's own garage, created if missing. */
  async defaultGarageId(userId: string): Promise<string> {
    const owned = await this.prisma.garageMember.findFirst({
      where: { userId, role: 'owner' },
      orderBy: { createdAt: 'asc' },
      select: { garageId: true },
    });
    if (owned) return owned.garageId;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const garage = await this.prisma.garage.create({
      data: {
        ownerId: userId,
        name: `Garasi ${user.name.split(' ')[0] ?? user.name}`,
        members: { create: { userId, role: 'owner' } },
      },
    });
    return garage.id;
  }

  /** Loads a vehicle the user can access with at least `minRole`, or throws 404/403. */
  async vehicle(userId: string, vehicleId: string, minRole: GarageRole = 'viewer') {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { vehicleModel: { include: { brand: true } } },
    });
    if (!vehicle) throw new NotFoundException('Kendaraan tidak ditemukan');
    try {
      await this.assertGarage(userId, vehicle.garageId, minRole);
    } catch (e) {
      if (e instanceof NotFoundException) throw new NotFoundException('Kendaraan tidak ditemukan');
      throw e;
    }
    return vehicle;
  }

  async serviceRecord(userId: string, serviceId: string, minRole: GarageRole = 'viewer') {
    const record = await this.prisma.serviceRecord.findUnique({
      where: { id: serviceId },
      select: { id: true, vehicleId: true, vehicle: { select: { garageId: true } } },
    });
    if (!record) throw new NotFoundException('Catatan servis tidak ditemukan');
    try {
      await this.assertGarage(userId, record.vehicle.garageId, minRole);
    } catch (e) {
      if (e instanceof NotFoundException) throw new NotFoundException('Catatan servis tidak ditemukan');
      throw e;
    }
    return record;
  }

  async workshop(userId: string, workshopId: string, minRole: GarageRole = 'viewer') {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException('Bengkel tidak ditemukan');
    try {
      await this.assertGarage(userId, workshop.garageId, minRole);
    } catch (e) {
      if (e instanceof NotFoundException) throw new NotFoundException('Bengkel tidak ditemukan');
      throw e;
    }
    return workshop;
  }
}
