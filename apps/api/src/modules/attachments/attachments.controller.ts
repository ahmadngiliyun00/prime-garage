import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ALLOWED_IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  REALTIME_EVENTS,
  attachmentUploadSchema,
  type AttachmentDto,
  type AttachmentUploadInput,
} from '@prime-garage/shared';
import type { Response } from 'express';
import sharp, { type OutputInfo } from 'sharp';
import { v7 as uuidv7 } from 'uuid';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators.js';
import { iso } from '../../common/dates.js';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { StorageService } from '../../common/storage.service.js';
import { uuid } from '../../common/uuid.pipe.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

type UploadedImage = { buffer: Buffer; mimetype: string; size: number };

/** FR-SVC-04 (receipt photos) and vehicle photos. */
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GarageAccessService,
    private readonly storage: StorageService,
    private readonly realtime: RealtimeService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedImage | undefined,
    @Body(new ZodValidationPipe(attachmentUploadSchema)) body: AttachmentUploadInput,
  ): Promise<AttachmentDto> {
    if (!file) throw new BadRequestException('File wajib diunggah');
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Hanya gambar JPEG, PNG, atau WebP');
    }

    let garageId: string;
    let vehicleId: string;
    if (body.ownerType === 'vehicle') {
      const v = await this.access.vehicle(user.id, body.ownerId, 'editor');
      garageId = v.garageId;
      vehicleId = v.id;
    } else {
      const r = await this.access.serviceRecord(user.id, body.ownerId, 'editor');
      garageId = r.vehicle.garageId;
      vehicleId = r.vehicleId;
    }

    let output: { data: Buffer; info: OutputInfo };
    try {
      output = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException('File gambar tidak dapat dibaca');
    }

    const id = uuidv7();
    const now = new Date();
    const relativePath = `${garageId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.webp`;
    await this.storage.write(relativePath, output.data);

    const row = await this.prisma.attachment.create({
      data: {
        id,
        garageId,
        ownerType: body.ownerType,
        ownerId: body.ownerId,
        filePath: relativePath,
        mimeType: 'image/webp',
        sizeBytes: output.info.size,
        width: output.info.width,
        height: output.info.height,
        createdById: user.id,
      },
    });

    if (body.ownerType === 'vehicle') {
      const previous = await this.prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { photoAttachmentId: true } });
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { photoAttachmentId: id } });
      if (previous.photoAttachmentId) await this.deleteRow(previous.photoAttachmentId);
      this.realtime.emitToGarage(REALTIME_EVENTS.vehicleChanged, { garageId, vehicleId });
    } else {
      this.realtime.emitToGarage(REALTIME_EVENTS.serviceChanged, { garageId, vehicleId, id: body.ownerId });
    }

    return {
      id: row.id,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      width: row.width,
      height: row.height,
      url: this.storage.signedUrl(row.id),
      createdAt: iso(row.createdAt),
    };
  }

  /** Signed URL target; works in <img> tags without an Authorization header. */
  @Public()
  @Get(':id/file')
  async file(
    @Param('id', uuid) id: string,
    @Query('exp') exp: string | undefined,
    @Query('sig') sig: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.storage.verify(id, exp, sig)) throw new ForbiddenException('Tautan kedaluwarsa');
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(this.storage.absolute(row.filePath));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Lampiran tidak ditemukan');
    await this.access.assertGarage(user.id, row.garageId, 'editor').catch(() => {
      throw new NotFoundException('Lampiran tidak ditemukan');
    });
    if (row.ownerType === 'vehicle') {
      await this.prisma.vehicle.updateMany({ where: { photoAttachmentId: id }, data: { photoAttachmentId: null } });
    }
    await this.deleteRow(id);
    this.realtime.emitToGarage(
      row.ownerType === 'vehicle' ? REALTIME_EVENTS.vehicleChanged : REALTIME_EVENTS.serviceChanged,
      { garageId: row.garageId, id: row.ownerId },
    );
  }

  private async deleteRow(id: string): Promise<void> {
    const row = await this.prisma.attachment.delete({ where: { id } });
    await this.storage.remove([row.filePath]);
  }
}
