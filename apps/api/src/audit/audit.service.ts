import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogParams {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  private sanitize(data: any): any {
    if (!data) return data;
    const cloned = JSON.parse(JSON.stringify(data));
    const sensitiveKeys = ['password', 'passwordhash', 'token', 'refreshtoken', 'secret', 'stripekey', 'creditcard'];

    const recursiveClean = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED_SENSITIVE_DATA]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          recursiveClean(obj[key]);
        }
      }
    };

    recursiveClean(cloned);
    return cloned;
  }

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldData: params.oldData ? this.sanitize(params.oldData) : undefined,
          newData: params.newData ? this.sanitize(params.newData) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Falha ao registrar log de auditoria:', error);
    }
  }

  async getLogs(tenantId: string, page = 1, limit = 50, entity?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (entity) {
      where.entity = entity;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
