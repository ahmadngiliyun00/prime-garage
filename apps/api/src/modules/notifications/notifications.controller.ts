import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { NotificationDto, Paginated } from '@prime-garage/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators.js';
import { toNotificationDto } from '../../common/serializers.js';
import { uuid } from '../../common/uuid.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** FR-NTF-06: in-app notification center. */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('cursor') cursor?: string): Promise<Paginated<NotificationDto>> {
    const take = 30;
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const items = rows.slice(0, take);
    return { items: items.map(toNotificationDto), nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null };
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return { count: await this.prisma.notification.count({ where: { userId: user.id, readAt: null } }) };
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  }
}
