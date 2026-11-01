import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './common/auth.guard.js';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';
import { CommonModule } from './common/common.module.js';
import { AttachmentsModule } from './modules/attachments/attachments.module.js';
import { AuthCoreModule } from './modules/auth/auth-core.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { WorkshopsModule } from './modules/workshops/workshops.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    CommonModule,
    AuthCoreModule,
    RealtimeModule,
    MaintenanceModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    VehiclesModule,
    WorkshopsModule,
    ServicesModule,
    AttachmentsModule,
    DashboardModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
