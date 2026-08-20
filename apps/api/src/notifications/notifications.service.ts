import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, userId?: string) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async markAsRead(tenantId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId,
        OR: [{ userId: null }, { userId }],
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async create(tenantId: string, data: { title: string; message: string; type?: string; link?: string; userId?: string }) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        link: data.link,
        userId: data.userId,
      },
    });
  }
}
