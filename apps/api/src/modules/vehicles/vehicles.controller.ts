import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  archiveVehicleSchema,
  createOdometerSchema,
  createVehicleSchema,
  updateRuleSchema,
  updateVehicleSchema,
  type ComponentStatusDto,
  type CreateOdometerInput,
  type CreateVehicleInput,
  type OdometerLogDto,
  type RuleDto,
  type UpdateRuleInput,
  type UpdateVehicleInput,
  type VehicleDto,
} from '@prime-garage/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators.js';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { toOdometerDto, toRuleDto } from '../../common/serializers.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { uuid } from '../../common/uuid.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MaintenanceService } from '../maintenance/maintenance.service.js';
import { VehiclesService } from './vehicles.service.js';


@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly access: GarageAccessService,
    private readonly maintenance: MaintenanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('includeArchived') includeArchived?: string): Promise<VehicleDto[]> {
    return this.vehicles.list(user.id, includeArchived === 'true');
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createVehicleSchema)) body: CreateVehicleInput,
  ): Promise<VehicleDto> {
    return this.vehicles.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<VehicleDto> {
    return this.vehicles.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) body: UpdateVehicleInput,
  ): Promise<VehicleDto> {
    return this.vehicles.update(user.id, id, body);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(archiveVehicleSchema)) body: { archived: boolean },
  ): Promise<VehicleDto> {
    return this.vehicles.setArchived(user.id, id, body.archived);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    return this.vehicles.remove(user.id, id);
  }

  @Post(':id/tour-complete')
  @HttpCode(200)
  tourComplete(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<VehicleDto> {
    return this.vehicles.completeTour(user.id, id);
  }

  // ---------- Odometer ----------

  @Get(':id/odometer')
  async odometer(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<OdometerLogDto[]> {
    return (await this.vehicles.listOdometer(user.id, id)).map(toOdometerDto);
  }

  @Post(':id/odometer')
  async addOdometer(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(createOdometerSchema)) body: CreateOdometerInput,
  ): Promise<OdometerLogDto> {
    return toOdometerDto(await this.vehicles.addOdometer(user.id, id, body));
  }

  @Delete(':id/odometer/:logId')
  @HttpCode(204)
  deleteOdometer(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('logId', uuid) logId: string,
  ): Promise<void> {
    return this.vehicles.deleteOdometer(user.id, id, logId);
  }

  // ---------- Rules and component status ----------

  @Get(':id/rules')
  async rules(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<RuleDto[]> {
    return (await this.vehicles.listRules(user.id, id)).map(toRuleDto);
  }

  @Patch(':id/rules/:ruleId')
  async updateRule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('ruleId', uuid) ruleId: string,
    @Body(new ZodValidationPipe(updateRuleSchema)) body: UpdateRuleInput,
  ): Promise<RuleDto> {
    return toRuleDto(await this.vehicles.updateRule(user.id, id, ruleId, body));
  }

  @Post(':id/rules/:ruleId/reset')
  @HttpCode(200)
  async resetRule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('ruleId', uuid) ruleId: string,
  ): Promise<RuleDto> {
    return toRuleDto(await this.vehicles.resetRule(user.id, id, ruleId));
  }

  /** FR-MNT-03: status, remaining life, and estimated due date per component rule. */
  @Get(':id/components')
  async components(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Query('includeDisabled') includeDisabled?: string,
  ): Promise<ComponentStatusDto[]> {
    const vehicle = await this.access.vehicle(user.id, id);
    const profile = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timezone: true } });
    return this.maintenance.componentsForVehicle(vehicle, profile.timezone, new Date(), {
      includeDisabled: includeDisabled === 'true',
    });
  }
}
