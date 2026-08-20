import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { LockService } from '../infrastructure/lock.service';
import { PaymentMethod, SaleStatus, StockMovementType, CashMovementType, CashSessionStatus, Prisma } from '@prisma/client';

export interface CheckoutItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lotId?: string;
  notes?: string;
}

export interface CheckoutPaymentDto {
  method: PaymentMethod;
  amount: number;
  installments?: number;
  reference?: string;
}

export interface CheckoutDto {
  storeId: string;
  terminalId?: string;
  cashSessionId?: string;
  customerId?: string;
  items: CheckoutItemDto[];
  payments: CheckoutPaymentDto[];
  discount?: number;
  notes?: string;
  idempotencyKey?: string;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private lockService: LockService,
  ) {}

  async findAll(tenantId: string, query: { storeId?: string; page?: number; limit?: number; status?: SaleStatus }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      tenantId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, sales] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, document: true } },
          user: { select: { id: true, name: true } },
          payments: true,
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, barcode: true } },
              lot: { select: { id: true, lotNumber: true, expirationDate: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: true,
            lot: true,
          },
        },
        payments: true,
        returns: {
          include: {
            items: { include: { product: true } },
            user: { select: { id: true, name: true } },
          },
        },
        fiscalDocuments: true,
      },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }

  // Checkout Atômico com Proteção contra Concorrência e FEFO
  async checkout(tenantId: string, userId: string, dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A venda precisa conter pelo menos um item');
    }

    if (!dto.payments || dto.payments.length === 0) {
      throw new BadRequestException('A venda precisa conter pelo menos um pagamento');
    }

    // 1. Verificar Idempotência
    if (dto.idempotencyKey) {
      const existingKey = await this.prisma.idempotencyKey.findUnique({
        where: { key: dto.idempotencyKey },
      });
      if (existingKey && existingKey.response) {
        return existingKey.response;
      }
    }

    // 2. Lock distribuído por produtos para evitar venda simultânea acima do estoque
    const productIds = dto.items.map((i) => i.productId).sort();
    const lockKey = `checkout:${tenantId}:${dto.storeId}:${productIds.join(':')}`;
    const acquired = await this.lockService.acquire(lockKey, 10);

    try {
      // 3. Execução Transacional Atômica no PostgreSQL
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Validar Sessão de Caixa (se informada)
          let cashSession = null;
          if (dto.cashSessionId) {
            cashSession = await tx.cashSession.findFirst({
              where: { id: dto.cashSessionId, tenantId, status: CashSessionStatus.OPEN },
            });
            if (!cashSession) {
              throw new BadRequestException('Sessão de caixa informada não está aberta');
            }
          }

          // Obter ou criar Localização de Estoque Padrão
          let defaultLoc = await tx.stockLocation.findFirst({
            where: { storeId: dto.storeId, isDefault: true },
          });
          if (!defaultLoc) {
            defaultLoc = await tx.stockLocation.findFirst({ where: { storeId: dto.storeId } });
          }
          if (!defaultLoc) throw new BadRequestException('Local de estoque não configurado para a loja');

          // Calcular totais
          let subtotal = 0;
          const itemsToCreate: any[] = [];
          const stockMovementsToCreate: any[] = [];

          for (const item of dto.items) {
            const product = await tx.product.findFirst({
              where: { id: item.productId, tenantId, active: true },
            });

            if (!product) {
              throw new NotFoundException(`Produto ${item.productId} não encontrado ou inativo`);
            }

            const itemUnitPrice = item.unitPrice || Number(product.salePrice);
            const itemDiscount = item.discount || 0;
            const itemTotal = itemUnitPrice * item.quantity - itemDiscount;
            subtotal += itemTotal;

            // Verificar Saldo de Estoque
            const stockBalance = await tx.stockBalance.findUnique({
              where: {
                storeId_locationId_productId: {
                  storeId: dto.storeId,
                  locationId: defaultLoc.id,
                  productId: item.productId,
                },
              },
            });

            const currentBalance = stockBalance ? Number(stockBalance.quantity) : 0;
            if (currentBalance < item.quantity) {
              throw new BadRequestException(
                `Estoque insuficiente para o produto "${product.name}". Saldo disponível: ${currentBalance}, solicitado: ${item.quantity}`,
              );
            }

            // Seleção de Lote via algoritmo FEFO se o produto controla lotes
            let selectedLotId = item.lotId;
            if (product.trackLots && !selectedLotId) {
              const earliestLot = await tx.stockLot.findFirst({
                where: {
                  storeId: dto.storeId,
                  productId: product.id,
                  quantity: { gte: item.quantity },
                  active: true,
                },
                orderBy: { expirationDate: 'asc' }, // FEFO
              });

              if (earliestLot) {
                selectedLotId = earliestLot.id;
                // Baixar do lote
                await tx.stockLot.update({
                  where: { id: earliestLot.id },
                  data: { quantity: Number(earliestLot.quantity) - item.quantity },
                });
              }
            } else if (selectedLotId) {
              const lot = await tx.stockLot.findUnique({ where: { id: selectedLotId } });
              if (lot) {
                await tx.stockLot.update({
                  where: { id: selectedLotId },
                  data: { quantity: Math.max(0, Number(lot.quantity) - item.quantity) },
                });
              }
            }

            const newBalance = currentBalance - item.quantity;

            // Baixar no StockBalance
            await tx.stockBalance.update({
              where: {
                storeId_locationId_productId: {
                  storeId: dto.storeId,
                  locationId: defaultLoc.id,
                  productId: item.productId,
                },
              },
              data: { quantity: newBalance },
            });

            itemsToCreate.push({
              tenantId,
              productId: product.id,
              lotId: selectedLotId,
              quantity: item.quantity,
              unitPrice: itemUnitPrice,
              discount: itemDiscount,
              total: itemTotal,
              costPrice: product.costPrice,
              notes: item.notes,
            });

            stockMovementsToCreate.push({
              tenantId,
              storeId: dto.storeId,
              productId: product.id,
              lotId: selectedLotId,
              type: StockMovementType.SALE,
              quantity: item.quantity,
              balanceAfter: newBalance,
              unitCost: Number(product.costPrice),
              notes: 'Venda no PDV',
              userId,
            });
          }

          const generalDiscount = dto.discount || 0;
          const totalSale = Math.max(0, subtotal - generalDiscount);

          // Validar valor dos pagamentos
          const totalPayments = dto.payments.reduce((acc, p) => acc + Number(p.amount), 0);
          if (Math.abs(totalPayments - totalSale) > 0.05 && totalPayments < totalSale) {
            throw new BadRequestException(
              `Valor total pago (R$ ${totalPayments.toFixed(2)}) é menor que o total da venda (R$ ${totalSale.toFixed(2)})`,
            );
          }

          // Gerar código sequencial legível da venda
          const saleCount = await tx.sale.count({ where: { tenantId } });
          const code = `VND-${String(saleCount + 1).padStart(6, '0')}`;

          // Criar Venda
          const sale = await tx.sale.create({
            data: {
              tenantId,
              storeId: dto.storeId,
              terminalId: dto.terminalId,
              cashSessionId: dto.cashSessionId,
              customerId: dto.customerId,
              userId,
              code,
              subtotal,
              discount: generalDiscount,
              total: totalSale,
              status: SaleStatus.COMPLETED,
              idempotencyKey: dto.idempotencyKey,
              notes: dto.notes,
              items: {
                create: itemsToCreate,
              },
              payments: {
                create: dto.payments.map((p) => ({
                  tenantId,
                  method: p.method,
                  amount: p.amount,
                  installments: p.installments || 1,
                  reference: p.reference,
                })),
              },
            },
            include: {
              items: { include: { product: true } },
              payments: true,
              customer: true,
              user: { select: { id: true, name: true } },
            },
          });

          // Registrar Movimentações de Estoque
          for (const mov of stockMovementsToCreate) {
            await tx.stockMovement.create({
              data: {
                ...mov,
                referenceType: 'SALE',
                referenceId: sale.id,
              },
            });
          }

          // Se houver sessão de caixa e pagamentos em dinheiro, registrar movimentação de caixa
          if (dto.cashSessionId) {
            const cashAmount = dto.payments
              .filter((p) => p.method === PaymentMethod.CASH)
              .reduce((acc, p) => acc + Number(p.amount), 0);

            if (cashAmount > 0) {
              await tx.cashMovement.create({
                data: {
                  tenantId,
                  cashSessionId: dto.cashSessionId,
                  type: CashMovementType.SALE,
                  amount: cashAmount,
                  reason: `Venda ${sale.code}`,
                  referenceId: sale.id,
                  userId,
                },
              });
            }
          }

          // Registrar Idempotência
          if (dto.idempotencyKey) {
            await tx.idempotencyKey.create({
              data: {
                key: dto.idempotencyKey,
                tenantId,
                response: JSON.parse(JSON.stringify(sale)),
                statusCode: 201,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
          }

          return sale;
        },
        {
          timeout: 10000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      // Invalidação de Cache
      await this.cacheService.del(`dashboard:sales:${tenantId}`);
      await this.cacheService.delPattern(`product:barcode:${tenantId}:*`);

      return result;
    } finally {
      await this.lockService.release(lockKey);
    }
  }

  // Devolução / Cancelamento de Venda
  async cancelSale(tenantId: string, saleId: string, userId: string, reason: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada');
    if (sale.status === SaleStatus.CANCELED) {
      throw new BadRequestException('Esta venda já foi cancelada');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Marcar venda como cancelada
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.CANCELED },
      });

      // 2. Local de estoque
      let defaultLoc = await tx.stockLocation.findFirst({
        where: { storeId: sale.storeId, isDefault: true },
      });
      if (!defaultLoc) {
        defaultLoc = await tx.stockLocation.findFirst({ where: { storeId: sale.storeId } });
      }

      // 3. Devolver produtos ao estoque
      for (const item of sale.items) {
        const stockBalance = await tx.stockBalance.findUnique({
          where: {
            storeId_locationId_productId: {
              storeId: sale.storeId,
              locationId: defaultLoc.id,
              productId: item.productId,
            },
          },
        });

        const newBalance = (stockBalance ? Number(stockBalance.quantity) : 0) + Number(item.quantity);

        await tx.stockBalance.upsert({
          where: {
            storeId_locationId_productId: {
              storeId: sale.storeId,
              locationId: defaultLoc.id,
              productId: item.productId,
            },
          },
          update: { quantity: newBalance },
          create: {
            tenantId,
            storeId: sale.storeId,
            locationId: defaultLoc.id,
            productId: item.productId,
            quantity: newBalance,
          },
        });

        // Estorno no lote se aplicável
        if (item.lotId) {
          const lot = await tx.stockLot.findUnique({ where: { id: item.lotId } });
          if (lot) {
            await tx.stockLot.update({
              where: { id: item.lotId },
              data: { quantity: Number(lot.quantity) + Number(item.quantity) },
            });
          }
        }

        // Registrar StockMovement de retorno
        await tx.stockMovement.create({
          data: {
            tenantId,
            storeId: sale.storeId,
            productId: item.productId,
            lotId: item.lotId,
            type: StockMovementType.RETURN,
            quantity: item.quantity,
            balanceAfter: newBalance,
            referenceType: 'SALE_CANCEL',
            referenceId: sale.id,
            notes: `Estorno de venda ${sale.code}: ${reason}`,
            userId,
          },
        });
      }

      // 4. Se a venda teve pagamento em dinheiro e estava atrelada a uma sessão de caixa aberta, registrar estorno de caixa
      if (sale.cashSessionId) {
        const cashPayment = sale.payments.find((p) => p.method === PaymentMethod.CASH);
        if (cashPayment) {
          await tx.cashMovement.create({
            data: {
              tenantId,
              cashSessionId: sale.cashSessionId,
              type: CashMovementType.REFUND,
              amount: cashPayment.amount,
              reason: `Cancelamento Venda ${sale.code}: ${reason}`,
              referenceId: sale.id,
              userId,
            },
          });
        }
      }

      // 5. Criar registro de devolução
      return tx.saleReturn.create({
        data: {
          tenantId,
          saleId: sale.id,
          userId,
          reason,
          totalRefunded: sale.total,
          items: {
            create: sale.items.map((i) => ({
              tenantId,
              saleItemId: i.id,
              productId: i.productId,
              quantity: i.quantity,
              refundAmount: i.total,
            })),
          },
        },
      });
    });
  }
}
