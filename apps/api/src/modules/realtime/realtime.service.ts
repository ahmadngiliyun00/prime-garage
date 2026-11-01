import { Injectable, Logger, Optional } from '@nestjs/common';
import { garageRoom, userRoom, type RealtimeEventName, type RealtimePayload } from '@prime-garage/shared';
import { env } from '../../config/env.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * Emits realtime events. Inside the API process it uses the gateway directly; inside the
 * worker process (no gateway) it forwards the event to the API over an internal HTTP call.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(@Optional() private readonly gateway?: RealtimeGateway) {}

  emitToGarage(event: RealtimeEventName, payload: RealtimePayload): void {
    this.emit(garageRoom(payload.garageId), event, payload);
  }

  emitToUser(userId: string, event: RealtimeEventName, payload: RealtimePayload): void {
    this.emit(userRoom(userId), event, payload);
  }

  emit(room: string, event: RealtimeEventName, payload: RealtimePayload): void {
    if (this.gateway?.server) {
      this.gateway.server.to(room).emit(event, payload);
      return;
    }
    void this.forward(room, event, payload);
  }

  private async forward(room: string, event: string, payload: RealtimePayload): Promise<void> {
    if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) return;
    try {
      await fetch(`${env.INTERNAL_API_URL}/api/internal/realtime`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': env.INTERNAL_API_SECRET },
        body: JSON.stringify({ room, event, payload }),
      });
    } catch (e) {
      this.logger.warn(`Realtime forward failed: ${(e as Error).message}`);
    }
  }
}
