import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { serviceRecordSchema, type ServiceRecordDto, type ServiceRecordInput } from '@prime-garage/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators.js';
import { uuid } from '../../common/uuid.pipe.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ServicesService } from './services.service.js';

/** FR-SVC-01 to FR-SVC-06. */
@Controller()
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get('vehicles/:vehicleId/services')
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', uuid) vehicleId: string,
    @Query('partCode') partCode?: string,
  ): Promise<ServiceRecordDto[]> {
    return this.services.list(user.id, vehicleId, partCode || undefined);
  }

  @Post('vehicles/:vehicleId/services')
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', uuid) vehicleId: string,
    @Body(new ZodValidationPipe(serviceRecordSchema)) body: ServiceRecordInput,
  ): Promise<ServiceRecordDto> {
    return this.services.create(user.id, vehicleId, body);
  }

  @Get('services/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<ServiceRecordDto> {
    return this.services.get(user.id, id);
  }

  @Put('services/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(serviceRecordSchema)) body: ServiceRecordInput,
  ): Promise<ServiceRecordDto> {
    return this.services.update(user.id, id, body);
  }

  @Delete('services/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    return this.services.remove(user.id, id);
  }
}
