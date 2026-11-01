import { Module } from '@nestjs/common';
import { WorkshopsController } from './workshops.controller.js';

@Module({ controllers: [WorkshopsController] })
export class WorkshopsModule {}
