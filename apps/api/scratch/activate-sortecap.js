const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Ativando assinatura e garantindo plano no banco de dados...');

  const user = await prisma.user.findFirst({
    where: { email: { equals: 'sortecapmati@gmail.com', mode: 'insensitive' } },
  });

  if (!user || !user.tenantId) {
    console.error('❌ Usuário ou tenantId não encontrado.');
    return;
  }

  // 1. Garantir que os planos oficiais existam na tabela Plan
  const planStarter = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: { name: 'RetailSyn Plano Starter', priceMonthly: 159.99, priceYearly: 1499.99, active: true },
    create: {
      name: 'RetailSyn Plano Starter',
      slug: 'starter',
      description: 'Ideal para 1 loja de conveniência ou minimercado.',
      priceMonthly: 159.99,
      priceYearly: 1499.99,
      maxStores: 1,
      maxUsers: 3,
      maxProducts: 1000,
      active: true,
    },
  });

  const planPro = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: { name: 'RetailSyn Plano Pro', priceMonthly: 249.99, priceYearly: 1999.99, active: true },
    create: {
      name: 'RetailSyn Plano Pro',
      slug: 'pro',
      description: 'Para redes de até 3 lojas com módulo fiscal.',
      priceMonthly: 249.99,
      priceYearly: 1999.99,
      maxStores: 3,
      maxUsers: 10,
      maxProducts: 1000,
      active: true,
    },
  });

  const planEnterprise = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: { name: 'RetailSyn Interprise', priceMonthly: 499.99, priceYearly: 3799.99, active: true },
    create: {
      name: 'RetailSyn Interprise',
      slug: 'enterprise',
      description: 'Ideal para grandes redes, lojas e usuários ilimitados.',
      priceMonthly: 499.99,
      priceYearly: 3799.99,
      maxStores: 999,
      maxUsers: 999,
      maxProducts: 999999,
      active: true,
    },
  });

  console.log('✅ Planos cadastrados na tabela Plan: Starter, Pro, Interprise');

  // 2. Garantir que a empresa (tenant) está active: true
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { active: true },
  });

  // 3. Ativar Assinatura para o tenant do cliente
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.upsert({
    where: { tenantId: user.tenantId },
    update: {
      planId: planPro.id,
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenew: true,
    },
    create: {
      tenantId: user.tenantId,
      planId: planPro.id,
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenew: true,
    },
  });

  console.log(`🎉 Assinatura do cliente ${user.email} (Empresa: Loja Sorte Mais TI MA) foi ATIVADA no Plano Pro!`);
  console.log({
    subscriptionId: subscription.id,
    planId: subscription.planId,
    status: subscription.status,
    periodEnd: subscription.currentPeriodEnd,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
