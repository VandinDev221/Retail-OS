import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRoleType, SubscriptionStatus, BillingCycle } from '@prisma/client';
import * as bcrypt from 'bcrypt';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeSDK = require('stripe');

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

  private getStripeClient(stripeSecretKey: string): any {
    const StripeClass = typeof StripeSDK === 'function' ? StripeSDK : (StripeSDK?.default || StripeSDK);
    return new StripeClass(stripeSecretKey);
  }

  // Listar Planos Ativos (Garantindo estritamente os 3 planos oficiais sem duplicidade)
  async getPlans() {
    const OFFICIAL_PLANS: Record<string, any> = {
      starter: {
        id: 'prod_V6bw5XekJTmQMD',
        name: 'RetailSyn Plano Starter',
        slug: 'starter',
        description: 'Ideal para 1 loja de conveniência ou minimercado individual.',
        priceMonthly: 159.99,
        priceYearly: 1499.99,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        maxStores: 1,
        maxUsers: 3,
        maxProducts: 1000,
      },
      pro: {
        id: 'prod_V6cdBztmqGbm0M',
        name: 'RetailSyn Plano Pro',
        slug: 'pro',
        description: 'Para redes de até 3 lojas',
        priceMonthly: 249.99,
        priceYearly: 1999.99,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        maxStores: 3,
        maxUsers: 10,
        maxProducts: 1000,
      },
      enterprise: {
        id: 'prod_enterprise',
        name: 'RetailSyn Interprise',
        slug: 'enterprise',
        description: 'Ideal para grandes redes, lojas e usuários ilimitados.',
        priceMonthly: 499.99,
        priceYearly: 3799.99,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        maxStores: 999,
        maxUsers: 999,
        maxProducts: 999999,
      },
    };

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey && !stripeSecretKey.includes('mock') && stripeSecretKey.trim().length > 5) {
      try {
        const stripe = this.getStripeClient(stripeSecretKey);

        const [productsRes, pricesRes] = await Promise.all([
          stripe.products.list({ active: true }),
          stripe.prices.list({ active: true }),
        ]);

        if (productsRes?.data?.length > 0 && pricesRes?.data?.length > 0) {
          const productIdToSlugMap = new Map<string, string>();

          productsRes.data.forEach((prod: any) => {
            const nameLower = prod.name?.toLowerCase() || '';
            const metaSlug = prod.metadata?.slug?.toLowerCase();

            if (metaSlug === 'starter' || nameLower.includes('starter') || prod.id === 'prod_V6bw5XekJTmQMD') {
              productIdToSlugMap.set(prod.id, 'starter');
              OFFICIAL_PLANS.starter.id = prod.id;
            } else if (metaSlug === 'enterprise' || metaSlug === 'interprise' || nameLower.includes('enterprise') || nameLower.includes('interprise')) {
              productIdToSlugMap.set(prod.id, 'enterprise');
              OFFICIAL_PLANS.enterprise.id = prod.id;
            } else if (metaSlug === 'pro' || nameLower.includes('pro') || prod.id === 'prod_V6cdBztmqGbm0M') {
              productIdToSlugMap.set(prod.id, 'pro');
              OFFICIAL_PLANS.pro.id = prod.id;
            }
          });

          pricesRes.data.forEach((p: any) => {
            const prodId = typeof p.product === 'string' ? p.product : p.product?.id;
            if (!prodId) return;

            const slug = productIdToSlugMap.get(prodId);
            if (slug && OFFICIAL_PLANS[slug]) {
              const plan = OFFICIAL_PLANS[slug];
              const amount = p.unit_amount ? p.unit_amount / 100 : 0;

              if (p.recurring?.interval === 'year') {
                if (amount > 0) plan.priceYearly = amount;
                if (!plan.stripePriceIdYearly) plan.stripePriceIdYearly = p.id;
              } else {
                if (amount > 0) plan.priceMonthly = amount;
                if (!plan.stripePriceIdMonthly) plan.stripePriceIdMonthly = p.id;
              }
            }
          });
        }
      } catch (stripeErr) {
        console.error('Erro ao buscar produtos e preços diretamente da Stripe API:', stripeErr);
      }
    }

    return [OFFICIAL_PLANS.starter, OFFICIAL_PLANS.pro, OFFICIAL_PLANS.enterprise];
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
        const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

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

  // --- INTEGRAÇÃO STRIPE CHECKOUT & PORTAL ---

  async createStripeCheckoutSession(tenantId: string, dto: CheckoutSubscriptionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const appUrl = this.configService.get<string>('APP_URL') || 'https://retailsyncbr.vercel.app';

    if (stripeSecretKey && !stripeSecretKey.includes('mock') && stripeSecretKey.trim().length > 5) {
      try {
        const stripe = this.getStripeClient(stripeSecretKey);

        // 1. Obter ou criar Cliente na Stripe
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

        // 2. Buscar o ID do Preço na Stripe
        let stripePriceId: string | null = null;

        if (dto.planSlug.startsWith('price_')) {
          stripePriceId = dto.planSlug;
        } else {
          const pricesRes = await stripe.prices.list({ active: true, expand: ['data.product'] });
          const targetInterval = dto.billingCycle === 'YEARLY' ? 'year' : 'month';

          const matchedPrice = pricesRes.data.find((p: any) => {
            const prod = p.product;
            const matchesSlug =
              prod?.id === dto.planSlug ||
              prod?.metadata?.slug === dto.planSlug ||
              prod?.name?.toLowerCase().includes(dto.planSlug.toLowerCase());
            return matchesSlug && p.recurring?.interval === targetInterval;
          });

          if (matchedPrice) {
            stripePriceId = matchedPrice.id;
          } else if (pricesRes.data.length > 0) {
            const fallbackPrice = pricesRes.data.find((p) => p.recurring?.interval === targetInterval) || pricesRes.data[0];
            stripePriceId = fallbackPrice.id;
          }
        }

        const lineItem = stripePriceId
          ? { price: stripePriceId, quantity: 1 }
          : {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: `Assinatura RetailSyn (${dto.planSlug.toUpperCase()})`,
                },
                unit_amount: dto.billingCycle === 'YEARLY' ? 199000 : 19900,
                recurring: {
                  interval: (dto.billingCycle === 'YEARLY' ? 'year' : 'month') as 'year' | 'month',
                },
              },
              quantity: 1,
            };

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [lineItem],
          success_url: `${appUrl}/login?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/login?status=canceled`,
          metadata: {
            tenantId: tenant.id,
            planSlug: dto.planSlug,
            billingCycle: dto.billingCycle,
          },
        });

        return { checkoutUrl: session.url };
      } catch (stripeErr: any) {
        console.error('Erro na criação da sessão do Stripe Checkout:', stripeErr);
        throw new BadRequestException(stripeErr?.message || 'Falha ao conectar com o serviço de Checkout da Stripe.');
      }
    }

    await this.checkout(tenantId, dto);
    return { checkoutUrl: `${appUrl}/login?status=success` };
  }

  async confirmStripeSession(sessionId: string) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey && !stripeSecretKey.includes('mock') && stripeSecretKey.trim().length > 5) {
      try {
        const stripe = this.getStripeClient(stripeSecretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
          const tenantId = session.metadata?.tenantId;
          const planSlug = session.metadata?.planSlug || 'pro';
          const billingCycle = (session.metadata?.billingCycle as 'MONTHLY' | 'YEARLY') || 'MONTHLY';

          if (tenantId) {
            await this.checkout(tenantId, { planSlug, billingCycle });
            return { success: true, message: 'Pagamento confirmado e conta ativada!' };
          }
        }
      } catch (err: any) {
        console.error('Erro ao confirmar sessão Stripe:', err);
      }
    }

    return { success: true, message: 'Conta ativada com sucesso!' };
  }

  async createStripeCustomerPortal(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Usuário não possui uma empresa/loja vinculada para gerenciar assinatura.');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada.');

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const appUrl = this.configService.get<string>('APP_URL') || 'https://retailsyncbr.vercel.app';

    if (stripeSecretKey && !stripeSecretKey.includes('mock') && stripeSecretKey.trim().length > 5) {
      try {
        const stripe = this.getStripeClient(stripeSecretKey);

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

        try {
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appUrl}/settings`,
          });
          return { portalUrl: portalSession.url };
        } catch (portalErr: any) {
          // Se o customerId não for encontrado na conta/ambiente atual do Stripe, recria o cliente e tenta novamente
          if (portalErr?.code === 'resource_missing' || portalErr?.message?.includes('No such customer')) {
            const newCustomer = await stripe.customers.create({
              email: tenant.email || undefined,
              name: tenant.name,
              metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
            });
            customerId = newCustomer.id;
            await this.prisma.tenant.update({
              where: { id: tenant.id },
              data: { stripeCustomerId: customerId },
            });

            const portalSession = await stripe.billingPortal.sessions.create({
              customer: customerId,
              return_url: `${appUrl}/settings`,
            });
            return { portalUrl: portalSession.url };
          }
          throw portalErr;
        }
      } catch (stripeErr: any) {
        console.error('Erro ao abrir o Portal da Stripe:', stripeErr?.message || stripeErr);
        throw new BadRequestException(
          stripeErr?.response?.message ||
            stripeErr?.message ||
            'Para acessar o Portal do Cliente, ative o Customer Portal nas configurações do seu Stripe Dashboard (Settings -> Billing -> Customer Portal).'
        );
      }
    }

    return { portalUrl: `${appUrl}/settings` };
  }

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

  async superAdminCreateTenant(userRole: UserRoleType, data: { name: string; slug?: string; cnpj?: string; email?: string; phone?: string; plan?: string }) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    const slugBase = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]/gi, '');
    const uniqueSlug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug || uniqueSlug,
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone,
        plan: (data.plan || 'PRO').toUpperCase(),
        active: true,
        stores: {
          create: {
            name: 'Loja Principal',
            code: 'MATRIZ-01',
            active: true,
          },
        },
      },
    });
  }

  async superAdminUpdateTenant(userRole: UserRoleType, id: string, data: { name?: string; cnpj?: string; email?: string; phone?: string; plan?: string; active?: boolean }) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.cnpj !== undefined ? { cnpj: data.cnpj } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.plan ? { plan: data.plan.toUpperCase() } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  async superAdminDeleteTenant(userRole: UserRoleType, id: string) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      // 1. Documentos Fiscais, Vendas e Pagamentos
      await tx.fiscalDocument.deleteMany({ where: { tenantId: id } });
      await tx.saleReturnItem.deleteMany({ where: { tenantId: id } });
      await tx.saleReturn.deleteMany({ where: { tenantId: id } });
      await tx.salePayment.deleteMany({ where: { tenantId: id } });
      await tx.saleItem.deleteMany({ where: { tenantId: id } });
      await tx.sale.deleteMany({ where: { tenantId: id } });

      // 2. Movimentações e Sessões de Caixa
      await tx.cashMovement.deleteMany({ where: { tenantId: id } });
      await tx.cashSession.deleteMany({ where: { tenantId: id } });
      await tx.cashRegister.deleteMany({ where: { tenantId: id } });

      // 3. Contas a Pagar e Contas a Receber
      await tx.accountPayable.deleteMany({ where: { tenantId: id } });
      await tx.accountReceivable.deleteMany({ where: { tenantId: id } });

      // 4. Inventários, Pedidos de Compra e Recebimento de Mercadorias
      await tx.inventoryCountItem.deleteMany({ where: { tenantId: id } });
      await tx.inventoryCount.deleteMany({ where: { tenantId: id } });
      await tx.goodsReceiptItem.deleteMany({ where: { tenantId: id } });
      await tx.goodsReceipt.deleteMany({ where: { tenantId: id } });
      await tx.purchaseOrderItem.deleteMany({ where: { tenantId: id } });
      await tx.purchaseOrder.deleteMany({ where: { tenantId: id } });

      // 5. Movimentações, Lotes e Balanço de Estoque
      await tx.stockMovement.deleteMany({ where: { tenantId: id } });
      await tx.stockLot.deleteMany({ where: { tenantId: id } });
      await tx.stockBalance.deleteMany({ where: { tenantId: id } });
      await tx.stockLocation.deleteMany({ where: { tenantId: id } });

      // 6. Catálogo (Produtos, Códigos de Barras, Categorias, Marcas, Unidades, Fornecedores, Clientes)
      await tx.productBarcode.deleteMany({ where: { tenantId: id } });
      await tx.product.deleteMany({ where: { tenantId: id } });
      await tx.category.deleteMany({ where: { tenantId: id } });
      await tx.brand.deleteMany({ where: { tenantId: id } });
      await tx.unit.deleteMany({ where: { tenantId: id } });
      await tx.supplier.deleteMany({ where: { tenantId: id } });
      await tx.customer.deleteMany({ where: { tenantId: id } });

      // 7. Infraestrutura (Terminais, Lojas, Usuários e RBAC)
      await tx.terminal.deleteMany({ where: { tenantId: id } });
      await tx.store.deleteMany({ where: { tenantId: id } });
      await tx.userRole.deleteMany({ where: { user: { tenantId: id } } });
      await tx.rolePermission.deleteMany({ where: { role: { tenantId: id } } });
      await tx.user.deleteMany({ where: { tenantId: id } });
      await tx.role.deleteMany({ where: { tenantId: id } });
      await tx.permission.deleteMany({ where: { tenantId: id } });

      // 8. Assinaturas, Logs, Notificações e Jobs
      await tx.auditLog.deleteMany({ where: { tenantId: id } });
      await tx.notification.deleteMany({ where: { tenantId: id } });
      await tx.job.deleteMany({ where: { tenantId: id } });
      await tx.subscription.deleteMany({ where: { tenantId: id } });

      // 9. Exclui a Empresa (Tenant)
      return tx.tenant.delete({ where: { id } });
    });
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

  // --- CRUD DE USUÁRIOS PARA SUPER ADMIN ---

  async superAdminListUsers(userRole: UserRoleType) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    return this.prisma.user.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async superAdminCreateUser(userRole: UserRoleType, data: { tenantId: string; name: string; email: string; password?: string; role: UserRoleType }) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    const passwordHash = await bcrypt.hash(data.password || 'Mudar123!', 10);

    const store = await this.prisma.store.findFirst({
      where: { tenantId: data.tenantId },
    });

    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        storeId: store?.id,
        name: data.name,
        email: data.email.trim().toLowerCase(),
        passwordHash,
        role: data.role,
        active: true,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async superAdminUpdateUser(userRole: UserRoleType, id: string, data: { name?: string; email?: string; password?: string; role?: UserRoleType; active?: boolean; tenantId?: string }) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.trim().toLowerCase();
    if (data.role) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.tenantId) updateData.tenantId = data.tenantId;
    if (data.password && data.password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async superAdminDeleteUser(userRole: UserRoleType, id: string) {
    if (userRole !== UserRoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Acesso exclusivo para Super Administradores da plataforma.');
    }

    return this.prisma.user.delete({
      where: { id },
    });
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
