import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRoleType, SubscriptionStatus, BillingCycle } from '@prisma/client';

export interface CreatePlanDto {
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
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
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // Listar Planos Ativos (Buscando dinamicamente da Stripe se configurada)
  async getPlans() {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey && !stripeSecretKey.includes('mock')) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

        const prices = await stripe.prices.list({
          expand: ['data.product'],
          active: true,
        });

        if (prices?.data?.length > 0) {
          const productsMap = new Map<string, any>();

          prices.data.forEach((p: any) => {
            const product = p.product;
            if (!product || !product.active) return;

            const productId = product.id;
            if (!productsMap.has(productId)) {
              productsMap.set(productId, {
                id: product.id,
                name: product.name,
                slug: product.metadata?.slug || product.name.toLowerCase().replace(/[^a-z0-9]/gi, '-'),
                description: product.description || '',
                priceMonthly: 0,
                priceYearly: 0,
                stripePriceIdMonthly: null,
                stripePriceIdYearly: null,
                maxStores: parseInt(product.metadata?.max_stores || '1', 10),
                maxUsers: parseInt(product.metadata?.max_users || '5', 10),
                maxProducts: parseInt(product.metadata?.max_products || '1000', 10),
              });
            }

            const item = productsMap.get(productId);
            const amount = p.unit_amount ? p.unit_amount / 100 : 0;

            if (p.recurring?.interval === 'year') {
              item.priceYearly = amount;
              item.stripePriceIdYearly = p.id;
              if (item.priceMonthly === 0) item.priceMonthly = Math.round(amount / 12);
            } else {
              item.priceMonthly = amount;
              item.stripePriceIdMonthly = p.id;
              if (item.priceYearly === 0) item.priceYearly = amount * 10;
            }
          });

          return Array.from(productsMap.values());
        }
      } catch (stripeErr) {
        // Em caso de falha de API, fallback para o banco local
      }
    }

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
        stripePriceIdMonthly: dto.stripePriceIdMonthly,
        stripePriceIdYearly: dto.stripePriceIdYearly,
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
        stripePriceIdMonthly: dto.stripePriceIdMonthly,
        stripePriceIdYearly: dto.stripePriceIdYearly,
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
      const defaultPlan = await this.prisma.plan.findFirst({ where: { slug: 'pro' } });
      if (defaultPlan) {
        const now = new Date();
        const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 dias trial

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

  // --- INTEGRAÇÃO STRIPE CHECKOUT ---

  async createStripeCheckoutSession(tenantId: string, dto: CheckoutSubscriptionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    // Tentar localizar o plano no banco ou buscar da Stripe
    let plan = await this.prisma.plan.findUnique({ where: { slug: dto.planSlug } });

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const appUrl = this.configService.get<string>('APP_URL') || 'https://retailsyncbr.vercel.app';

    if (stripeSecretKey && !stripeSecretKey.includes('mock')) {
      const Stripe = require('stripe');
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

      // Obter ou criar Cliente na Stripe
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: tenant.email || undefined,
          name: tenant.name,
          metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
        });
        customerId = customer.id;
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const priceId = plan
        ? dto.billingCycle === 'YEARLY'
          ? plan.stripePriceIdYearly
          : plan.stripePriceIdMonthly
        : null;

      // Criar Sessão de Checkout da Stripe
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          priceId
            ? { price: priceId, quantity: 1 }
            : {
                price_data: {
                  currency: 'brl',
                  product_data: {
                    name: `Assinatura RetailSyn - ${plan?.name || dto.planSlug}`,
                    description: plan?.description || undefined,
                  },
                  unit_amount: Math.round(
                    Number(dto.billingCycle === 'YEARLY' ? plan?.priceYearly || 1990 : plan?.priceMonthly || 199) * 100
                  ),
                  recurring: {
                    interval: dto.billingCycle === 'YEARLY' ? 'year' : 'month',
                  },
                },
                quantity: 1,
              },
        ],
        success_url: `${appUrl}/settings?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${appUrl}/settings?status=canceled`,
        metadata: {
          tenantId: tenant.id,
          planSlug: dto.planSlug,
          billingCycle: dto.billingCycle,
        },
      });

      return { checkoutUrl: session.url };
    }

    // Modo Simulado (Direct Activation) caso Stripe esteja em homologação sem secret key
    await this.checkout(tenantId, dto);
    return { checkoutUrl: `${appUrl}/settings?status=success` };
  }

  // Criar Portal do Cliente na Stripe (Para alterar cartão ou cancelar assinatura)
  async createStripeCustomerPortal(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.stripeCustomerId) {
      throw new BadRequestException('Empresa não possui registro financeiro na Stripe.');
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const appUrl = this.configService.get<string>('APP_URL') || 'https://retailsyncbr.vercel.app';

    if (stripeSecretKey && !stripeSecretKey.includes('mock')) {
      const Stripe = require('stripe');
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${appUrl}/settings`,
      });

      return { portalUrl: portalSession.url };
    }

    return { portalUrl: `${appUrl}/settings` };
  }

  // Webhook Oficial da Stripe para ativação automática de pagamentos
  async handleStripeWebhook(event: any) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        const planSlug = session.metadata?.planSlug;
        const billingCycle = session.metadata?.billingCycle || 'MONTHLY';

        if (tenantId && planSlug) {
          await this.checkout(tenantId, { planSlug, billingCycle });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subObj = event.data.object;
        const tenant = await this.prisma.tenant.findFirst({
          where: { stripeCustomerId: subObj.customer },
        });
        if (tenant) {
          await this.superAdminUpdateTenantStatus(UserRoleType.SUPER_ADMIN, tenant.id, false, SubscriptionStatus.CANCELED);
        }
        break;
      }
    }
    return { received: true };
  }

  // Trocar / Assinar Plano (Direto / Webhook)
  async checkout(tenantId: string, dto: CheckoutSubscriptionDto) {
    let plan = await this.prisma.plan.findUnique({
      where: { slug: dto.planSlug },
    });

    if (!plan) {
      plan = await this.prisma.plan.findFirst({ where: { slug: 'pro' } });
    }

    if (!plan) throw new NotFoundException('Plano não encontrado');

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

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan.slug.toUpperCase(), active: true },
    });

    return subscription;
  }

  // --- PAINEL SUPER ADMIN PLATAFORMA ---

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
      stripeCustomerId: t.stripeCustomerId,
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
