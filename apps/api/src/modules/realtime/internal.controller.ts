import { Body, Controller, ForbiddenException, Headers, HttpCode, Post } from '@nestjs/common';
import { REALTIME_EVENTS, type RealtimeEventName, type RealtimePayload } from '@prime-garage/shared';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { Public } from '../../common/decorators.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { RealtimeService } from './realtime.service.js';

const eventNames = Object.values(REALTIME_EVENTS) as [RealtimeEventName, ...RealtimeEventName[]];
const bodySchema = z.object({
  room: z.string().regex(/^(garage|user):[0-9a-f-]{36}$/),
  event: z.enum(eventNames),
  payload: z.object({ garageId: z.string(), vehicleId: z.string().optional(), id: z.string().optional() }),
});

/** Used by the worker process to push realtime events through the API's Socket.IO server. */
@Controller('internal')
export class InternalController {
  constructor(private readonly realtime: RealtimeService) {}

  @Public()
  @Post('realtime')
  @HttpCode(204)
  emit(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body(new ZodValidationPipe(bodySchema)) body: z.infer<typeof bodySchema>,
  ): void {
    const expected = env.INTERNAL_API_SECRET;
    if (!expected || !secret || secret.length !== expected.length || !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      throw new ForbiddenException();
    }
    this.realtime.emit(body.room, body.event, body.payload as RealtimePayload);
  }
}
