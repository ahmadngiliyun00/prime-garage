import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import { REALTIME_PATH, garageRoom, userRoom } from '@prime-garage/shared';
import type { Server, Socket } from 'socket.io';
import { corsOrigin } from '../../config/cors.js';
import { env, isProduction } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from '../auth/token.service.js';

/**
 * Socket.IO gateway (ADR-005). Clients authenticate with the access token in the handshake
 * and are joined to one room per garage they belong to.
 */
@WebSocketGateway({
  path: REALTIME_PATH,
  // Same rule as the HTTP API; with no CORS_ORIGINS configured any origin may connect (auth is by token).
  cors: { origin: env.CORS_ORIGINS.length ? corsOrigin({ allowed: env.CORS_ORIGINS, production: isProduction }) : true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const auth = socket.handshake.auth as { token?: unknown } | undefined;
      const token = typeof auth?.token === 'string' ? auth.token : undefined;
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      this.tokens
        .verifyAccessToken(token)
        .then((user) => {
          socket.data['user'] = user;
          next();
        })
        .catch(() => next(new Error('unauthorized')));
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    const user = socket.data['user'] as { id: string } | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    const memberships = await this.prisma.garageMember.findMany({ where: { userId: user.id }, select: { garageId: true } });
    await socket.join([userRoom(user.id), ...memberships.map((m) => garageRoom(m.garageId))]);
    this.logger.debug(`socket ${socket.id} joined ${memberships.length} garage room(s)`);
  }
}
