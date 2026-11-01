import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  updateWorkshopSchema,
  workshopSchema,
  type UpdateWorkshopInput,
  type WorkshopDto,
  type WorkshopInput,
} from '@prime-garage/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators.js';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { toWorkshopDto } from '../../common/serializers.js';
import { uuid } from '../../common/uuid.pipe.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

/** FR-WS-01, FR-WS-02: workshops are private per garage in the MVP. */
@Controller('workshops')
export class WorkshopsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GarageAccessService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('garageId') garageId?: string): Promise<WorkshopDto[]> {
    const garageIds = garageId ? [garageId] : await this.access.garageIdsForUser(user.id);
    if (garageId) await this.access.assertGarage(user.id, garageId);
    const rows = await this.prisma.workshop.findMany({
      where: { garageId: { in: garageIds } },
      include: { _count: { select: { serviceRecords: true } } },
      orderBy: { name: 'asc' },
    });
    return rows.map(toWorkshopDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<WorkshopDto> {
    await this.access.workshop(user.id, id);
    return toWorkshopDto(
      await this.prisma.workshop.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { serviceRecords: true } } },
      }),
    );
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(workshopSchema)) body: WorkshopInput,
  ): Promise<WorkshopDto> {
    const garageId = body.garageId ?? (await this.access.defaultGarageId(user.id));
    await this.access.assertGarage(user.id, garageId, 'editor');
    const { garageId: _ignored, ...data } = body;
    const row = await this.prisma.workshop.create({
      data: { ...data, latitude: data.latitude ?? null, longitude: data.longitude ?? null, garageId, createdById: user.id },
    });
    this.realtime.emitToGarage(REALTIME_EVENTS.workshopChanged, { garageId, id: row.id });
    return toWorkshopDto(row);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(updateWorkshopSchema)) body: UpdateWorkshopInput,
  ): Promise<WorkshopDto> {
    const ws = await this.access.workshop(user.id, id, 'editor');
    const { garageId: _ignored, ...data } = body;
    const row = await this.prisma.workshop.update({ where: { id }, data });
    this.realtime.emitToGarage(REALTIME_EVENTS.workshopChanged, { garageId: ws.garageId, id });
    return toWorkshopDto(row);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    const ws = await this.access.workshop(user.id, id, 'editor');
    // Service records keep their data; workshop_id becomes NULL (ON DELETE SET NULL).
    await this.prisma.workshop.delete({ where: { id } });
    this.realtime.emitToGarage(REALTIME_EVENTS.workshopChanged, { garageId: ws.garageId, id });
  }
}
