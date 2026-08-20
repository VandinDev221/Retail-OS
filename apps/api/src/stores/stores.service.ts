import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.store.findMany({
      where: { tenantId },
      include: {
        terminals: true,
        stockLocations: true,
        cashRegisters: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, tenantId },
      include: {
        terminals: true,
        stockLocations: true,
        cashRegisters: true,
      },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return store;
  }

  async create(tenantId: string, data: { name: string; code?: string; address?: string; phone?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          tenantId,
          name: data.name,
          code: data.code,
          address: data.address,
          phone: data.phone,
        },
      });

      // Criar estoque principal padrão
      await tx.stockLocation.create({
        data: {
          tenantId,
          storeId: store.id,
          name: 'Estoque Principal',
          isDefault: true,
        },
      });

      // Criar terminal e caixa padrão
      const terminal = await tx.terminal.create({
        data: {
          tenantId,
          storeId: store.id,
          name: 'Caixa 01',
          code: 'CX01',
        },
      });

      await tx.cashRegister.create({
        data: {
          tenantId,
          storeId: store.id,
          terminalId: terminal.id,
          name: 'Gaveta PDV 01',
        },
      });

      return store;
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; code?: string; address?: string; phone?: string; active?: boolean }) {
    await this.findById(tenantId, id);
    return this.prisma.store.update({
      where: { id },
      data,
    });
  }

  async createTerminal(tenantId: string, storeId: string, data: { name: string; code: string }) {
    return this.prisma.terminal.create({
      data: {
        tenantId,
        storeId,
        name: data.name,
        code: data.code,
      },
    });
  }
}
