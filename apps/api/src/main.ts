import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { networkInterfaces } from 'node:os';
import { AppModule } from './app.module.js';
import { env, isProduction } from './config/env.js';

/** Development hint: which address a phone on the same Wi-Fi should use. */
function logDevReachability(): void {
  if (env.HOST === '127.0.0.1' || env.HOST === 'localhost') {
    Logger.warn('Hanya bisa diakses dari komputer ini. Untuk mencoba dari HP, set HOST=0.0.0.0 di apps/api/.env', 'Bootstrap');
    return;
  }
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i!.address}:${env.PORT}/api/health`);
  if (lan.length > 0) Logger.log(`Dari HP (Wi-Fi yang sama): ${lan.join(', ')}`, 'Bootstrap');
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProduction ? ['log', 'warn', 'error'] : ['log', 'warn', 'error', 'debug'],
  });
  app.setGlobalPrefix('api');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();
  await app.listen(env.PORT, env.HOST);
  Logger.log(`PrimeGarage API listening on http://${env.HOST}:${env.PORT}/api`, 'Bootstrap');
  if (!isProduction) logDevReachability();
}

await bootstrap();
