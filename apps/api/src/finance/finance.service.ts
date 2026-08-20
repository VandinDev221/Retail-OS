import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialStatus, Prisma } from '@prisma/client';

export interface CreatePayableDto {
  storeId: string;
  supplierId?: string;
  description: string;
  amount: number;
  dueDate: string;
  category?: string;
  notes?: string;
}

export interface CreateReceivableDto {
  storeId: string;
  customerId?: string;
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // Contas a Pagar
  async getPayables(tenantId: string, storeId?: string, status?: FinancialStatus) {
    return this.prisma.accountPayable.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        supplier: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createPayable(tenantId: string, dto: CreatePayableDto) {
    return this.prisma.accountPayable.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        supplierId: dto.supplierId,
        description: dto.description,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        status: FinancialStatus.PENDING,
        category: dto.category,
        notes: dto.notes,
      },
    });
  }

  async markPayableAsPaid(tenantId: string, id: string) {
    const item = await this.prisma.accountPayable.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Conta a pagar não encontrada');

    return this.prisma.accountPayable.update({
      where: { id },
      data: {
        status: FinancialStatus.PAID,
        paidDate: new Date(),
      },
    });
  }

  // Contas a Receber
  async getReceivables(tenantId: string, storeId?: string, status?: FinancialStatus) {
    return this.prisma.accountReceivable.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        customer: true,
        sale: { select: { id: true, code: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createReceivable(tenantId: string, dto: CreateReceivableDto) {
    return this.prisma.accountReceivable.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        customerId: dto.customerId,
        description: dto.description,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        status: FinancialStatus.PENDING,
        notes: dto.notes,
      },
    });
  }

  async markReceivableAsReceived(tenantId: string, id: string) {
    const item = await this.prisma.accountReceivable.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Conta a receber não encontrada');

    return this.prisma.accountReceivable.update({
      where: { id },
      data: {
        status: FinancialStatus.PAID,
        receivedDate: new Date(),
      },
    });
  }

  // Fluxo de caixa simplificado
  async getCashFlowSummary(tenantId: string, storeId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [payablesPending, payablesPaid, receivablesPending, receivablesReceived, salesTotal] = await Promise.all([
      this.prisma.accountPayable.aggregate({
        where: { tenantId, ...(storeId ? { storeId } : {}), status: FinancialStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.accountPayable.aggregate({
        where: { tenantId, ...(storeId ? { storeId } : {}), status: FinancialStatus.PAID, paidDate: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.accountReceivable.aggregate({
        where: { tenantId, ...(storeId ? { storeId } : {}), status: FinancialStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.accountReceivable.aggregate({
        where: { tenantId, ...(storeId ? { storeId } : {}), status: FinancialStatus.PAID, receivedDate: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, ...(storeId ? { storeId } : {}), status: 'COMPLETED', createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { total: true },
      }),
    ]);

    return {
      period: `${now.getMonth() + 1}/${now.getFullYear()}`,
      payablesPending: Number(payablesPending._sum.amount || 0),
      payablesPaidThisMonth: Number(payablesPaid._sum.amount || 0),
      receivablesPending: Number(receivablesPending._sum.amount || 0),
      receivablesReceivedThisMonth: Number(receivablesReceived._sum.amount || 0),
      salesRevenueThisMonth: Number(salesTotal._sum.total || 0),
    };
  }
}
