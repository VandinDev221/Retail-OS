import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CashSessionStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // Dashboard Geral (com cache de 30s)
  async getDashboard(tenantId: string, storeId?: string) {
    const cacheKey = `dashboard:${tenantId}:${storeId || 'all'}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const now = new Date();
    const d7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Queries paralelas eficientes
    const [
      todaySales,
      todayItemsCount,
      lowStockProducts,
      expiringLotsCount,
      expiredLotsCount,
      openCashSessions,
    ] = await Promise.all([
      // Vendas hoje
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          status: 'COMPLETED',
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Quantidade de itens vendidos hoje
      this.prisma.saleItem.aggregate({
        where: {
          tenantId,
          sale: {
            status: 'COMPLETED',
            createdAt: { gte: startOfToday, lte: endOfToday },
            ...(storeId ? { storeId } : {}),
          },
        },
        _sum: { quantity: true },
      }),
      // Produtos com estoque baixo
      this.prisma.product.count({
        where: {
          tenantId,
          active: true,
          stockBalances: {
            some: {
              ...(storeId ? { storeId } : {}),
              quantity: { lte: 5 },
            },
          },
        },
      }),
      // Lotes a vencer em 7 dias
      this.prisma.stockLot.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          active: true,
          quantity: { gt: 0 },
          expirationDate: { gte: now, lte: d7 },
        },
      }),
      // Lotes já vencidos com saldo
      this.prisma.stockLot.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          active: true,
          quantity: { gt: 0 },
          expirationDate: { lt: now },
        },
      }),
      // Caixas abertos
      this.prisma.cashSession.findMany({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          status: CashSessionStatus.OPEN,
        },
        include: {
          cashRegister: true,
          openedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const revenue = Number(todaySales._sum.total || 0);
    const count = todaySales._count.id || 0;
    const averageTicket = count > 0 ? revenue / count : 0;
    const itemsSold = Number(todayItemsCount._sum.quantity || 0);

    const result = {
      today: {
        revenue,
        salesCount: count,
        averageTicket,
        itemsSold,
      },
      stock: {
        lowStockCount: lowStockProducts,
        expiringIn7DaysCount: expiringLotsCount,
        expiredCount: expiredLotsCount,
      },
      cash: {
        openRegistersCount: openCashSessions.length,
        openSessions: openCashSessions,
      },
      updatedAt: new Date().toISOString(),
    };

    // Cacheia por 30s
    await this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  // Relatório de Vendas por Período
  async getSalesReport(tenantId: string, storeId?: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        user: { select: { id: true, name: true } },
        payments: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const paymentTotals: Record<string, number> = {};
    const operatorTotals: Record<string, { count: number; total: number }> = {};
    let grandTotal = 0;

    sales.forEach((s) => {
      grandTotal += Number(s.total);

      // Pagamentos
      s.payments.forEach((p) => {
        paymentTotals[p.method] = (paymentTotals[p.method] || 0) + Number(p.amount);
      });

      // Operadores
      const opName = s.user.name;
      if (!operatorTotals[opName]) operatorTotals[opName] = { count: 0, total: 0 };
      operatorTotals[opName].count++;
      operatorTotals[opName].total += Number(s.total);
    });

    return {
      period: { start, end },
      grandTotal,
      salesCount: sales.length,
      averageTicket: sales.length > 0 ? grandTotal / sales.length : 0,
      paymentTotals,
      operatorTotals,
      sales: sales.slice(0, 100), // Limitar para performance
    };
  }

  // Curva ABC de Produtos
  async getAbcCurve(tenantId: string, storeId?: string) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        sale: {
          status: 'COMPLETED',
          ...(storeId ? { storeId } : {}),
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
    });

    const totalRevenue = items.reduce((acc, i) => acc + Number(i._sum.total || 0), 0);

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, barcode: true },
    });

    const prodMap = new Map(products.map((p) => [p.id, p]));

    let accumulatedRevenue = 0;
    const ranked = items.map((i) => {
      const revenue = Number(i._sum.total || 0);
      accumulatedRevenue += revenue;
      const accumulatedPercentage = totalRevenue > 0 ? (accumulatedRevenue / totalRevenue) * 100 : 0;

      let classification: 'A' | 'B' | 'C' = 'C';
      if (accumulatedPercentage <= 70) {
        classification = 'A';
      } else if (accumulatedPercentage <= 90) {
        classification = 'B';
      }

      return {
        product: prodMap.get(i.productId),
        quantitySold: Number(i._sum.quantity || 0),
        revenue,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        accumulatedPercentage,
        classification,
      };
    });

    return {
      totalRevenue,
      totalItemsSold: items.reduce((acc, i) => acc + Number(i._sum.quantity || 0), 0),
      items: ranked,
    };
  }
}
