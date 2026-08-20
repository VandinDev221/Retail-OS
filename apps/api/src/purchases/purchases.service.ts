import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrderStatus, StockMovementType, FinancialStatus } from '@prisma/client';

export interface CreatePurchaseOrderDto {
  storeId: string;
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
  notes?: string;
}

export interface ReceiveGoodsDto {
  storeId: string;
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber?: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
    lotNumber?: string;
    expirationDate?: string;
  }[];
  dueDate?: string; // Para contas a pagar
}

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAllOrders(tenantId: string, storeId?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrder(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const totalAmount = dto.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        supplierId: dto.supplierId,
        status: PurchaseOrderStatus.SENT,
        totalAmount,
        notes: dto.notes,
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            tenantId,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });
  }

  // Recebimento de Mercadorias com entrada no estoque, lotes e financeiro
  async receiveGoods(tenantId: string, userId: string, dto: ReceiveGoodsDto) {
    const totalAmount = dto.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Localização de estoque padrão
      let defaultLoc = await tx.stockLocation.findFirst({
        where: { storeId: dto.storeId, isDefault: true },
      });
      if (!defaultLoc) {
        defaultLoc = await tx.stockLocation.findFirst({ where: { storeId: dto.storeId } });
      }
      if (!defaultLoc) throw new BadRequestException('Local de estoque não configurado');

      // 2. Criar registro de recebimento
      const receipt = await tx.goodsReceipt.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          supplierId: dto.supplierId,
          purchaseOrderId: dto.purchaseOrderId,
          invoiceNumber: dto.invoiceNumber,
          totalAmount,
          receivedById: userId,
          items: {
            create: dto.items.map((i) => ({
              tenantId,
              productId: i.productId,
              quantity: i.quantity,
              unitCost: i.unitCost,
              lotNumber: i.lotNumber,
              expirationDate: i.expirationDate ? new Date(i.expirationDate) : null,
            })),
          },
        },
      });

      // 3. Atualizar estoque de cada item
      for (const item of dto.items) {
        let lotId: string | undefined = undefined;

        // Criar lote se houver validade ou número de lote
        if (item.lotNumber && item.expirationDate) {
          const lot = await tx.stockLot.create({
            data: {
              tenantId,
              storeId: dto.storeId,
              productId: item.productId,
              supplierId: dto.supplierId,
              lotNumber: item.lotNumber,
              expirationDate: new Date(item.expirationDate),
              quantity: item.quantity,
              costPrice: item.unitCost,
            },
          });
          lotId = lot.id;
        }

        // Saldo atual
        const currentBalance = await tx.stockBalance.findUnique({
          where: {
            storeId_locationId_productId: {
              storeId: dto.storeId,
              locationId: defaultLoc.id,
              productId: item.productId,
            },
          },
        });

        const newQty = (currentBalance ? Number(currentBalance.quantity) : 0) + item.quantity;

        // Atualizar saldo
        await tx.stockBalance.upsert({
          where: {
            storeId_locationId_productId: {
              storeId: dto.storeId,
              locationId: defaultLoc.id,
              productId: item.productId,
            },
          },
          update: { quantity: newQty },
          create: {
            tenantId,
            storeId: dto.storeId,
            locationId: defaultLoc.id,
            productId: item.productId,
            quantity: newQty,
          },
        });

        // Registrar movimentação de compra
        await tx.stockMovement.create({
          data: {
            tenantId,
            storeId: dto.storeId,
            productId: item.productId,
            lotId,
            type: StockMovementType.PURCHASE,
            quantity: item.quantity,
            balanceAfter: newQty,
            unitCost: item.unitCost,
            referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id,
            notes: `Recebimento NF: ${dto.invoiceNumber || 'S/N'}`,
            userId,
          },
        });

        // Atualizar custo no cadastro do produto
        await tx.product.update({
          where: { id: item.productId },
          data: { costPrice: item.unitCost },
        });
      }

      // 4. Lançar no Contas a Pagar
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await tx.accountPayable.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          supplierId: dto.supplierId,
          description: `Compra Fornecedor - NF ${dto.invoiceNumber || receipt.id.slice(0, 8)}`,
          amount: totalAmount,
          dueDate,
          status: FinancialStatus.PENDING,
          category: 'COMPRA_MERCADORIA',
        },
      });

      // 5. Se houver pedido de compra vinculado, marcar como recebido
      if (dto.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: PurchaseOrderStatus.RECEIVED },
        });
      }

      return receipt;
    });
  }
}
