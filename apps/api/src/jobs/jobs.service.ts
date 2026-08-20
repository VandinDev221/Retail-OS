import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private prisma: PrismaService) {}

  async enqueue(type: string, payload: any, tenantId?: string, delaySeconds = 0) {
    const availableAt = new Date(Date.now() + delaySeconds * 1000);
    return this.prisma.job.create({
      data: {
        tenantId,
        type,
        payload,
        status: JobStatus.PENDING,
        availableAt,
      },
    });
  }

  // Processamento de lote acionado por Cron externo
  async processBatch(batchSize = 10) {
    const now = new Date();

    // 1. Buscar e bloquear jobs disponíveis
    const jobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.PENDING,
        availableAt: { lte: now },
      },
      take: batchSize,
      orderBy: { availableAt: 'asc' },
    });

    if (jobs.length === 0) {
      return { processed: 0, message: 'Nenhum job pendente para processamento' };
    }

    const results: any[] = [];

    for (const job of jobs) {
      // Bloquear job
      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PROCESSING,
          lockedAt: now,
          attempts: job.attempts + 1,
        },
      });

      try {
        await this.executeJob(job.type, job.payload as any, job.tenantId);

        await this.prisma.job.update({
          where: { id: job.id },
          data: {
            status: JobStatus.COMPLETED,
            finishedAt: new Date(),
            error: null,
          },
        });
        results.push({ id: job.id, type: job.type, status: 'COMPLETED' });
      } catch (error: any) {
        this.logger.error(`Erro ao executar job ${job.id} (${job.type}):`, error);
        const willBeDead = job.attempts + 1 >= job.maxAttempts;

        await this.prisma.job.update({
          where: { id: job.id },
          data: {
            status: willBeDead ? JobStatus.DEAD : JobStatus.FAILED,
            error: error?.message || 'Erro desconhecido',
            availableAt: new Date(Date.now() + 60 * 1000), // Tentar novamente em 1 min
          },
        });
        results.push({ id: job.id, type: job.type, status: willBeDead ? 'DEAD' : 'FAILED', error: error?.message });
      }
    }

    // Executar rotinas diárias de manutenção se não houver jobs
    await this.runSystemMaintenance();

    return {
      processed: results.length,
      results,
    };
  }

  private async executeJob(type: string, payload: any, tenantId?: string) {
    this.logger.log(`Executando job: ${type}`);

    switch (type) {
      case 'CHECK_EXPIRING_LOTS':
        await this.checkExpiringLots(tenantId);
        break;
      case 'CHECK_LOW_STOCK':
        await this.checkLowStock(tenantId);
        break;
      default:
        this.logger.warn(`Tipo de job desconhecido: ${type}`);
    }
  }

  private async runSystemMaintenance() {
    // 1. Limpar chaves de idempotência expiradas
    await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private async checkExpiringLots(tenantId?: string) {
    const d7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiring = await this.prisma.stockLot.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        active: true,
        quantity: { gt: 0 },
        expirationDate: { lte: d7 },
      },
      include: { product: true },
      take: 20,
    });

    for (const lot of expiring) {
      await this.prisma.notification.create({
        data: {
          tenantId: lot.tenantId,
          title: 'Alerta de Validade (FEFO)',
          message: `O lote ${lot.lotNumber} do produto "${lot.product.name}" vence em breve (${lot.expirationDate.toLocaleDateString('pt-BR')})`,
          type: 'WARNING',
        },
      });
    }
  }

  private async checkLowStock(tenantId?: string) {
    const lowStock = await this.prisma.stockBalance.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        quantity: { lte: 5 },
      },
      include: { product: true },
      take: 20,
    });

    for (const item of lowStock) {
      await this.prisma.notification.create({
        data: {
          tenantId: item.tenantId,
          title: 'Alerta de Estoque Baixo',
          message: `O produto "${item.product.name}" está com estoque crítico (${item.quantity} unidades)`,
          type: 'WARNING',
        },
      });
    }
  }
}
