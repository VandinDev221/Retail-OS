import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CashSessionStatus, CashMovementType, PaymentMethod, Prisma } from '@prisma/client';

export interface OpenSessionDto {
  storeId: string;
  cashRegisterId: string;
  initialBalance: number;
  notes?: string;
}

export interface CashMovementDto {
  amount: number;
  reason: string;
  notes?: string;
}

export interface CloseSessionDto {
  reportedBalance: number;
  justification?: string;
  notes?: string;
}

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  async getRegisters(tenantId: string, storeId: string) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId, storeId, active: true },
      include: {
        terminal: true,
        sessions: {
          where: { status: CashSessionStatus.OPEN },
          include: { openedBy: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async getActiveSession(tenantId: string, storeId: string, userId?: string) {
    return this.prisma.cashSession.findFirst({
      where: {
        tenantId,
        storeId,
        status: CashSessionStatus.OPEN,
        ...(userId ? { openedById: userId } : {}),
      },
      include: {
        cashRegister: true,
        openedBy: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async openSession(tenantId: string, userId: string, dto: OpenSessionDto) {
    // Verificar se o caixa já está aberto
    const openSession = await this.prisma.cashSession.findFirst({
      where: {
        cashRegisterId: dto.cashRegisterId,
        status: CashSessionStatus.OPEN,
      },
    });

    if (openSession) {
      throw new ConflictException('Este caixa registrador já possui uma sessão aberta.');
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          cashRegisterId: dto.cashRegisterId,
          openedById: userId,
          status: CashSessionStatus.OPEN,
          initialBalance: dto.initialBalance,
          notes: dto.notes,
          openedAt: new Date(),
        },
      });

      // Registrar movimento de abertura
      if (dto.initialBalance > 0) {
        await tx.cashMovement.create({
          data: {
            tenantId,
            cashSessionId: session.id,
            type: CashMovementType.OPENING,
            amount: dto.initialBalance,
            reason: 'Fundo de troco inicial / Abertura de caixa',
            userId,
          },
        });
      }

      return session;
    });
  }

  async registerSuprimento(tenantId: string, sessionId: string, userId: string, dto: CashMovementDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id: sessionId, tenantId, status: CashSessionStatus.OPEN },
    });

    if (!session) throw new NotFoundException('Sessão de caixa aberta não encontrada');

    return this.prisma.cashMovement.create({
      data: {
        tenantId,
        cashSessionId: session.id,
        type: CashMovementType.SUPPLY,
        amount: dto.amount,
        reason: dto.reason,
        notes: dto.notes,
        userId,
      },
    });
  }

  async registerSangria(tenantId: string, sessionId: string, userId: string, dto: CashMovementDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id: sessionId, tenantId, status: CashSessionStatus.OPEN },
    });

    if (!session) throw new NotFoundException('Sessão de caixa aberta não encontrada');

    return this.prisma.cashMovement.create({
      data: {
        tenantId,
        cashSessionId: session.id,
        type: CashMovementType.SANGRIA,
        amount: dto.amount,
        reason: dto.reason,
        notes: dto.notes,
        userId,
      },
    });
  }

  // Fechamento cego de caixa com conciliação
  async closeSession(tenantId: string, sessionId: string, userId: string, dto: CloseSessionDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id: sessionId, tenantId, status: CashSessionStatus.OPEN },
      include: {
        movements: true,
        sales: {
          where: { status: 'COMPLETED' },
          include: { payments: true },
        },
      },
    });

    if (!session) throw new NotFoundException('Sessão de caixa aberta não encontrada');

    // Calcular Saldo Esperado em Dinheiro:
    // Saldo Inicial + Vendas em Dinheiro + Suprimentos - Sangrias - Estornos Dinheiro
    let cashSalesTotal = 0;
    session.sales.forEach((sale) => {
      sale.payments.forEach((p) => {
        if (p.method === PaymentMethod.CASH) {
          cashSalesTotal += Number(p.amount);
        }
      });
    });

    let supplyTotal = 0;
    let sangriaTotal = 0;
    let refundTotal = 0;

    session.movements.forEach((m) => {
      if (m.type === CashMovementType.SUPPLY) supplyTotal += Number(m.amount);
      if (m.type === CashMovementType.SANGRIA) sangriaTotal += Number(m.amount);
      if (m.type === CashMovementType.REFUND) refundTotal += Number(m.amount);
    });

    const initial = Number(session.initialBalance);
    const expectedBalance = initial + cashSalesTotal + supplyTotal - sangriaTotal - refundTotal;
    const difference = dto.reportedBalance - expectedBalance;

    // Se houver diferença e nenhuma justificativa, exigir
    if (Math.abs(difference) > 0.01 && !dto.justification) {
      throw new BadRequestException(
        `Existe uma diferença de R$ ${difference.toFixed(2)} entre o saldo esperado e o informado. É obrigatório informar a justificativa.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Registrar movimento de fechamento
      await tx.cashMovement.create({
        data: {
          tenantId,
          cashSessionId: session.id,
          type: CashMovementType.CLOSING,
          amount: dto.reportedBalance,
          reason: `Fechamento de caixa. Esperado: R$ ${expectedBalance.toFixed(2)} | Informado: R$ ${dto.reportedBalance.toFixed(2)} | Dif: R$ ${difference.toFixed(2)}`,
          notes: dto.justification,
          userId,
        },
      });

      return tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: CashSessionStatus.CLOSED,
          closedById: userId,
          closedAt: new Date(),
          expectedBalance,
          reportedBalance: dto.reportedBalance,
          difference,
          justification: dto.justification,
          notes: dto.notes,
        },
      });
    });
  }

  // Relatório consolidado da sessão de caixa
  async getSessionReport(tenantId: string, sessionId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        cashRegister: { include: { store: true, terminal: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
        movements: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        sales: {
          include: {
            payments: true,
            user: { select: { id: true, name: true } },
            items: { include: { product: true } },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada');

    // Totalizadores por forma de pagamento
    const paymentTotals: Record<string, number> = {
      CASH: 0,
      PIX: 0,
      DEBIT_CARD: 0,
      CREDIT_CARD: 0,
      STORE_CREDIT: 0,
      OTHER: 0,
    };

    let totalRevenue = 0;
    let completedSalesCount = 0;
    let canceledSalesCount = 0;

    session.sales.forEach((sale) => {
      if (sale.status === 'COMPLETED') {
        completedSalesCount++;
        totalRevenue += Number(sale.total);
        sale.payments.forEach((p) => {
          paymentTotals[p.method] = (paymentTotals[p.method] || 0) + Number(p.amount);
        });
      } else {
        canceledSalesCount++;
      }
    });

    return {
      session,
      metrics: {
        totalRevenue,
        completedSalesCount,
        canceledSalesCount,
        paymentTotals,
        initialBalance: Number(session.initialBalance),
        expectedBalance: session.expectedBalance ? Number(session.expectedBalance) : null,
        reportedBalance: session.reportedBalance ? Number(session.reportedBalance) : null,
        difference: session.difference ? Number(session.difference) : null,
      },
    };
  }
}
