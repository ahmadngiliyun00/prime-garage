import { Global, Module } from '@nestjs/common';
import { AuthCoreModule } from '../auth/auth-core.module.js';
import { InternalController } from './internal.controller.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

/** API process: gateway plus emitter. */
@Global()
@Module({
  imports: [AuthCoreModule],
  controllers: [InternalController],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}

/** Worker process: emitter only (forwards to the API). */
@Global()
@Module({
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeForwarderModule {}
