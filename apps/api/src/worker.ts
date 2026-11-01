import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { env } from './config/env.js';
import { ReminderService } from './modules/notifications/reminder.service.js';
import { WorkerModule } from './worker.module.js';

/**
 * Reminder worker (PM2 process `prime-garage-worker`, exactly one instance).
 *   node dist/worker.js                 -> stays alive, runs on REMINDER_CRON in REMINDER_TZ
 *   node dist/worker.js --once          -> runs once and exits
 *   node dist/worker.js --once --now=2026-04-20T00:00:00Z   -> simulate a date (testing)
 */
async function bootstrap(): Promise<void> {
  const args = process.argv.slice(2);
  const once = args.includes('--once');
  const nowArg = args.find((a) => a.startsWith('--now='))?.slice('--now='.length);

  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: ['log', 'warn', 'error'] });
  app.enableShutdownHooks();
  if (once) {
    const summary = await app.get(ReminderService).run(nowArg ? new Date(nowArg) : new Date());
    Logger.log(`Done: ${JSON.stringify(summary)}`, 'Worker');
    await app.close();
    return;
  }
  Logger.log(`PrimeGarage worker started, reminders on "${env.REMINDER_CRON}" (${env.REMINDER_TZ})`, 'Worker');
}

await bootstrap();
