import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  imports: [VehiclesModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
