import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { document: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        sales: { take: 10, orderBy: { createdAt: 'desc' } },
        accountsReceivable: { where: { status: 'PENDING' } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  async create(tenantId: string, data: { name: string; document?: string; email?: string; phone?: string; address?: string; creditLimit?: number }) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        address: data.address,
        creditLimit: data.creditLimit ?? 0,
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; document?: string; email?: string; phone?: string; address?: string; creditLimit?: number; active?: boolean }) {
    await this.findById(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }
}
