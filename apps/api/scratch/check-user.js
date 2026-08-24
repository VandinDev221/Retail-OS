const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'sortecapmati@gmail.com';
  console.log(`🔍 Buscando usuário: ${email}...`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: {
      tenant: {
        include: {
          subscription: {
            include: { plan: true }
          }
        }
      }
    }
  });

  if (!user) {
    console.log(`❌ Usuário com e-mail ${email} NÃO foi encontrado no banco de dados.`);
    const tenant = await prisma.tenant.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
    if (tenant) {
      console.log(`ℹ️ Porém foi encontrado um Tenant com este email:`, tenant);
    }
    return;
  }

  console.log('✅ Usuário encontrado:');
  console.log({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    tenantId: user.tenantId,
    storeId: user.storeId,
    createdAt: user.createdAt,
  });

  if (user.tenant) {
    console.log('\n🏢 Empresa (Tenant) associada:');
    console.log({
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
      active: user.tenant.active,
      status: user.tenant.status,
      stripeCustomerId: user.tenant.stripeCustomerId,
      subscription: user.tenant.subscription,
    });
  } else {
    console.log('\n⚠️ Usuário NÃO possui tenantId vinculado (tenant: null).');
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
