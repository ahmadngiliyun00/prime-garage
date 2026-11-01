import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common';
import {
  registerPushTokenSchema,
  updateProfileSchema,
  type GarageDto,
  type RegisterPushTokenInput,
  type UpdateProfileInput,
  type UserDto,
} from '@prime-garage/shared';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators.js';
import { toUserDto } from '../../common/serializers.js';
import { StorageService } from '../../common/storage.service.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REFRESH_COOKIE } from '../auth/auth.controller.js';

@Controller('me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return toUserDto(await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  }

  @Patch()
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<UserDto> {
    return toUserDto(await this.prisma.user.update({ where: { id: user.id }, data: body }));
  }

  @Get('garages')
  async garages(@CurrentUser() user: AuthUser): Promise<GarageDto[]> {
    const rows = await this.prisma.garageMember.findMany({
      where: { userId: user.id },
      include: { garage: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ id: r.garage.id, name: r.garage.name, role: r.role, ownerId: r.garage.ownerId }));
  }

  /** FR-AUTH-04: deletes the account and every garage the user owns (cascade). */
  @Delete()
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    const files = await this.prisma.attachment.findMany({
      where: { garage: { ownerId: user.id } },
      select: { filePath: true },
    });
    await this.prisma.$transaction([
      this.prisma.garage.deleteMany({ where: { ownerId: user.id } }),
      this.prisma.user.delete({ where: { id: user.id } }),
    ]);
    await this.storage.remove(files.map((f) => f.filePath));
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }

  @Post('push-tokens')
  @HttpCode(204)
  async registerPushToken(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(registerPushTokenSchema)) body: RegisterPushTokenInput,
  ): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: body.token },
      create: { userId: user.id, token: body.token, platform: body.platform, deviceName: body.deviceName },
      update: { userId: user.id, platform: body.platform, deviceName: body.deviceName, lastSeenAt: new Date() },
    });
  }

  @Delete('push-tokens/:token')
  @HttpCode(204)
  async removePushToken(@CurrentUser() user: AuthUser, @Param('token') token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
  }
}
