import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service.js';

@Module({ providers: [ReminderService], exports: [ReminderService] })
export class ReminderModule {}
