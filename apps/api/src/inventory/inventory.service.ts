import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType, InventoryCountStatus, Prisma } from '@prisma/client';

export interface CreateStockMovementDto {
  storeId: string;
  productId: string;
  lotId?: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId?: string;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getBalances(tenantId: string, storeId: string, search?: string) {
    const where: Prisma.StockBalanceWhereInput = {
      tenantId,
      storeId,
    };

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    return this.prisma.stockBalance.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            unit: true,
          },
        },
        location: true,
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getMovements(tenantId: string, storeId: string, page = 1, limit = 50, productId?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      storeId,
      ...(productId ? { productId } : {}),
    };

    const [total, movements] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, barcode: true } },
          lot: { select: { id: true, lotNumber: true, expirationDate: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: movements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLots(tenantId: string, storeId: string, productId?: string) {
    return this.prisma.stockLot.findMany({
      where: {
        tenantId,
        storeId,
        active: true,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true, barcode: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expirationDate: 'asc' }, // FEFO default
    });
  }

  // Alertas de validade por faixa de dias (FEFO)
  async getExpiryAlerts(tenantId: string, storeId: string) {
    const now = new Date();
    const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const d7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const d15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeLots = await this.prisma.stockLot.findMany({
      where: {
        tenantId,
        storeId,
        active: true,
        quantity: { gt: 0 },
      },
      include: {
        product: { select: { id: true, name: true, barcode: true, sku: true } },
      },
      orderBy: { expirationDate: 'asc' },
    });

    const expired: any[] = [];
    const expiringIn3Days: any[] = [];
    const expiringIn7Days: any[] = [];
    const expiringIn15Days: any[] = [];
    const expiringIn30Days: any[] = [];

    activeLots.forEach((lot) => {
      const exp = new Date(lot.expirationDate);
      if (exp < now) {
        expired.push(lot);
      } else if (exp <= d3) {
        expiringIn3Days.push(lot);
      } else if (exp <= d7) {
        expiringIn7Days.push(lot);
      } else if (exp <= d15) {
        expiringIn15Days.push(lot);
      } else if (exp <= d30) {
        expiringIn30Days.push(lot);
      }
    });

    return {
      summary: {
        expiredCount: expired.length,
        expiringIn3DaysCount: expiringIn3Days.length,
        expiringIn7DaysCount: expiringIn7Days.length,
        expiringIn15DaysCount: expiringIn15Days.length,
        expiringIn30DaysCount: expiringIn30Days.length,
      },
      expired,
      expiringIn3Days,
      expiringIn7Days,
      expiringIn15Days,
      expiringIn30Days,
    };
  }

  // Realizar ajuste manual avulso de estoque
  async adjustStock(tenantId: string, dto: CreateStockMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      // Obter ou criar localização padrão
      let defaultLocation = await tx.stockLocation.findFirst({
        where: { storeId: dto.storeId, isDefault: true },
      });

      if (!defaultLocation) {
        defaultLocation = await tx.stockLocation.findFirst({
          where: { storeId: dto.storeId },
        });
      }

      if (!defaultLocation) {
        throw new BadRequestException('Nenhum local de estoque encontrado para esta loja');
      }

      // Buscar saldo atual
      const currentBalanceRecord = await tx.stockBalance.findUnique({
        where: {
          storeId_locationId_productId: {
            storeId: dto.storeId,
            locationId: defaultLocation.id,
            productId: dto.productId,
          },
        },
      });

      const currentQty = currentBalanceRecord ? Number(currentBalanceRecord.quantity) : 0;
      const positiveTypes: StockMovementType[] = [
        StockMovementType.PURCHASE,
        StockMovementType.RETURN,
        StockMovementType.INITIAL_BALANCE,
      ];
      const isPositive = positiveTypes.includes(dto.type) || (dto.type === StockMovementType.ADJUSTMENT && dto.quantity > 0);

      const delta = isPositive ? Math.abs(dto.quantity) : -Math.abs(dto.quantity);
      const newQty = currentQty + delta;

      if (newQty < 0) {
        throw new BadRequestException(`Estoque insuficiente. Saldo atual: ${currentQty}, solicitado: ${dto.quantity}`);
      }

      // Atualizar StockBalance
      await tx.stockBalance.upsert({
        where: {
          storeId_locationId_productId: {
            storeId: dto.storeId,
            locationId: defaultLocation.id,
            productId: dto.productId,
          },
        },
        update: { quantity: newQty },
        create: {
          tenantId,
          storeId: dto.storeId,
          locationId: defaultLocation.id,
          productId: dto.productId,
          quantity: newQty,
        },
      });

      // Atualizar Lote se especificado
      if (dto.lotId) {
        const lot = await tx.stockLot.findUnique({ where: { id: dto.lotId } });
        if (lot) {
          const lotNewQty = Number(lot.quantity) + delta;
          await tx.stockLot.update({
            where: { id: dto.lotId },
            data: { quantity: Math.max(0, lotNewQty) },
          });
        }
      }

      // Registrar StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          productId: dto.productId,
          lotId: dto.lotId,
          type: dto.type,
          quantity: dto.quantity,
          balanceAfter: newQty,
          unitCost: dto.unitCost ?? 0,
          referenceType: dto.referenceType || 'MANUAL_ADJUSTMENT',
          referenceId: dto.referenceId,
          notes: dto.notes,
          userId: dto.userId,
        },
      });

      return movement;
    });
  }

  // --- INVENTÁRIO ---
  async createInventoryCount(tenantId: string, storeId: string, userId: string, notes?: string) {
    const activeCount = await this.prisma.inventoryCount.findFirst({
      where: { storeId, status: InventoryCountStatus.IN_PROGRESS },
    });

    if (activeCount) {
      throw new BadRequestException('Já existe uma contagem de inventário em andamento para esta loja');
    }

    // Gerar snapshot dos produtos e quantidades esperadas
    const balances = await this.prisma.stockBalance.findMany({
      where: { storeId, tenantId },
      include: { product: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.inventoryCount.create({
        data: {
          tenantId,
          storeId,
          status: InventoryCountStatus.IN_PROGRESS,
          openedById: userId,
          notes,
        },
      });

      if (balances.length > 0) {
        await tx.inventoryCountItem.createMany({
          data: balances.map((b) => ({
            tenantId,
            inventoryCountId: count.id,
            productId: b.productId,
            expectedQty: b.quantity,
            countedQty: b.quantity, // Default para conferência
            difference: 0,
          })),
        });
      }

      return tx.inventoryCount.findUnique({
        where: { id: count.id },
        include: { items: { include: { product: true } } },
      });
    });
  }

  async updateInventoryCountItem(tenantId: string, countId: string, itemId: string, countedQty: number, notes?: string) {
    const item = await this.prisma.inventoryCountItem.findFirst({
      where: { id: itemId, inventoryCountId: countId, tenantId },
    });

    if (!item) throw new NotFoundException('Item de contagem não encontrado');

    const difference = countedQty - Number(item.expectedQty);

    return this.prisma.inventoryCountItem.update({
      where: { id: itemId },
      data: {
        countedQty,
        difference,
        notes,
      },
    });
  }

  async applyInventoryCount(tenantId: string, countId: string, userId: string) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id: countId, tenantId },
      include: { items: { include: { product: true } } },
    });

    if (!count) throw new NotFoundException('Inventário não encontrado');
    if (count.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Este inventário não está aberto para aplicação');
    }

    return this.prisma.$transaction(async (tx) => {
      const defaultLocation = await tx.stockLocation.findFirst({
        where: { storeId: count.storeId, isDefault: true },
      });

      if (!defaultLocation) throw new BadRequestException('Localização de estoque padrão não encontrada');

      for (const item of count.items) {
        if (Number(item.difference) !== 0) {
          // Atualizar saldo
          await tx.stockBalance.upsert({
            where: {
              storeId_locationId_productId: {
                storeId: count.storeId,
                locationId: defaultLocation.id,
                productId: item.productId,
              },
            },
            update: { quantity: item.countedQty },
            create: {
              tenantId,
              storeId: count.storeId,
              locationId: defaultLocation.id,
              productId: item.productId,
              quantity: item.countedQty,
            },
          });

          // Criar movimentação de ajuste
          await tx.stockMovement.create({
            data: {
              tenantId,
              storeId: count.storeId,
              productId: item.productId,
              type: StockMovementType.ADJUSTMENT,
              quantity: Math.abs(Number(item.difference)),
              balanceAfter: item.countedQty,
              referenceType: 'INVENTORY_COUNT',
              referenceId: count.id,
              notes: `Ajuste de inventário: Esperado ${item.expectedQty} | Contado ${item.countedQty}`,
              userId,
            },
          });
        }
      }

      // Marcar inventário como aplicado
      return tx.inventoryCount.update({
        where: { id: count.id },
        data: {
          status: InventoryCountStatus.APPLIED,
          appliedById: userId,
          appliedAt: new Date(),
        },
      });
    });
  }
}
