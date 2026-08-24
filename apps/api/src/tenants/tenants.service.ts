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

  async updateTenant(
    tenantId: string,
    data: {
      name?: string;
      phone?: string;
      cnpj?: string;
      email?: string;
      ie?: string;
      address?: string;
      crt?: string;
      cscToken?: string;
      cscId?: string;
      sefazEnvironment?: string;
      certificatePassword?: string;
      certificateName?: string;
    },
  ) {
    const { address, ie, ...tenantData } = data;

    // Atualizar Tenant
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: tenantData,
    });

    // Atualizar Loja Principal com Endereço e Telefone se informados
    const firstStore = await this.prisma.store.findFirst({ where: { tenantId } });
    if (firstStore && (address || data.phone || data.name)) {
      await this.prisma.store.update({
        where: { id: firstStore.id },
        data: {
          ...(address ? { address } : {}),
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.name ? { name: data.name } : {}),
        },
      });
    }

    return this.findById(tenantId);
  }
}
