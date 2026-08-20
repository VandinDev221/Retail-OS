import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRoleType, SubscriptionStatus, BillingCycle } from '@prisma/client';

export interface CreatePlanDto {
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  maxStores?: number;
  maxUsers?: number;
  maxProducts?: number;
}

export interface CheckoutSubscriptionDto {
  planSlug: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  // Listar Planos Ativos
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  // Criar ou Atualizar Plano (Apenas Super Admin)
  async upsertPlan(dto: CreatePlanDto) {
    return this.prisma.plan.upsert({
      where: { slug: dto.slug },
      update: {
        name: dto.name,
        description: dto.description,
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        maxStores: dto.maxStores || 1,
        maxUsers: dto.maxUsers || 5,
        maxProducts: dto.maxProducts || 1000,
      },
      create: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        maxStores: dto.maxStores || 1,
        maxUsers: dto.maxUsers || 5,
        maxProducts: dto.maxProducts || 1000,
        active: true,
      },
    });
  }

  // Obter assinatura da loja do usuário logado
  async getMySubscription(tenantId: string) {
    let sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!sub) {
      // Se não possuir assinatura vinculada, vincula ao plano PRO no período de Testes (Trial 14 dias)
      const defaultPlan = await this.prisma.plan.findFirst({ where: { slug: 'pro' } });
      if (defaultPlan) {
        const now = new Date();
        const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 dias

        sub = await this.prisma.subscription.create({
          data: {
            tenantId,
            planId: defaultPlan.id,
            billingCycle: BillingCycle.MONTHLY,
            status: SubscriptionStatus.TRIAL,
            currentPeriodStart: now,
            currentPeriodEnd: end,
          },
          include: { plan: true },
        });
      }
    }

    return sub;
  }

  // Trocar / Assinar Plano (Checkout)
  async checkout(tenantId: string, dto: CheckoutSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { slug: dto.planSlug },
    });

    if (!plan) throw new NotFoundException('Plano selecionado não encontrado');

    const now = new Date();
    const daysToAdd = dto.billingCycle === 'YEARLY' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        billingCycle: dto.billingCycle === 'YEARLY' ? BillingCycle.YEARLY : BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
      create: {
        tenantId,
        planId: plan.id,
        billingCycle: dto.billingCycle === 'YEARLY' ? BillingCycle.YEARLY : BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
      include: { plan: true },
    });

    // Atualizar slug do plano no tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan.slug.toUpperCase() },
    });

    return subscription;
  }

  // --- PAINEL SUPER ADMIN PLATAFORMA ---

  // Listar todas as empresas cadastradas no sistema com métricas
  async superAdminListTenants(userRole: UserRoleType) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: {
            stores: true,
            users: true,
            products: true,
            sales: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      cnpj: t.cnpj,
      email: t.email,
      phone: t.phone,
      active: t.active,
      createdAt: t.createdAt,
      plan: t.subscription?.plan?.name || t.plan,
      subscriptionStatus: t.subscription?.status || (t.active ? 'ACTIVE' : 'CANCELED'),
      billingCycle: t.subscription?.billingCycle || 'MONTHLY',
      periodEnd: t.subscription?.currentPeriodEnd,
      metrics: {
        storesCount: t._count.stores,
        usersCount: t._count.users,
        productsCount: t._count.products,
        salesCount: t._count.sales,
      },
    }));
  }

  // Alterar Status da Assinatura / Bloqueio da Empresa
  async superAdminUpdateTenantStatus(userRole: UserRoleType, tenantId: string, active: boolean, status?: SubscriptionStatus) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { active },
    });

    if (status) {
      await this.prisma.subscription.updateMany({
        where: { tenantId },
        data: { status },
      });
    }

    return tenant;
  }

  // Logs Globais da Plataforma (Monitoramento de Infraestrutura)
  async superAdminGetSystemLogs(userRole: UserRoleType) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    return this.prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }
}
