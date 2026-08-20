import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        stores: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async updateTenant(tenantId: string, data: { name?: string; phone?: string; cnpj?: string; email?: string }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }
}
