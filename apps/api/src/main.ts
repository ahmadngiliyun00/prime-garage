import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { env, isProduction } from './config/env.js';

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
}

await bootstrap();
