import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, search?: string) {
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { tradeName: { contains: search, mode: 'insensitive' } },
                { document: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchaseOrders: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    return supplier;
  }

  async create(tenantId: string, data: { name: string; tradeName?: string; document?: string; email?: string; phone?: string; address?: string }) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: data.name,
        tradeName: data.tradeName,
        document: data.document,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; tradeName?: string; document?: string; email?: string; phone?: string; address?: string; active?: boolean }) {
    await this.findById(tenantId, id);
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }
}
