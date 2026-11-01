import { ArgumentsHost, Catch, HttpStatus, Logger, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

/** Maps common Prisma errors to HTTP responses. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan pada server';
    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Data yang sama sudah ada';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Data tidak ditemukan';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Data terkait tidak valid';
        break;
      default:
        this.logger.error(exception.message, exception.stack);
    }
    res.status(status).json({ statusCode: status, message });
  }
}
