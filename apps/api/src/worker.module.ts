import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './modules/mail/mail.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { ReminderModule } from './modules/notifications/reminder.module.js';
import { RealtimeForwarderModule } from './modules/realtime/realtime.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

/** Worker process: daily reminders only (no HTTP server, no gateway). */
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, MailModule, MaintenanceModule, RealtimeForwarderModule, ReminderModule],
})
export class WorkerModule {}
