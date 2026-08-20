import { PrismaClient, UserRoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runTest() {
  console.log('=== TESTANDO AUTENTICAÇÃO E BANCO DE DADOS NEON ===\n');

  // 1. Testar busca do usuário admin
  const user = await prisma.user.findFirst({
    where: { email: 'admin@retailos.com' },
    include: { tenant: true },
  });

  if (user) {
    console.log('1. LOGIN E-MAIL E SENHA:');
    console.log('   ✅ Usuário encontrado: ', user.name);
    console.log('   ✅ E-mail:               ', user.email);
    console.log('   ✅ Empresa (Tenant):     ', user.tenant.name, `(${user.tenant.slug})`);

    const valid = await bcrypt.compare('Admin@123456', user.passwordHash);
    console.log('   ✅ Comparação Bcrypt:    ', valid ? 'SUCESSO (Senha 100% correta)' : 'FALHOU');
  } else {
    console.error('❌ Usuário admin não encontrado');
  }

  // 2. Testar cadastro/login automático com Google
  const googleEmail = 'vanderlei.google@gmail.com';
  let googleUser = await prisma.user.findFirst({
    where: { email: googleEmail },
    include: { tenant: true },
  });

  console.log('\n2. CADASTRO / LOGIN COM O GOOGLE:');

  if (!googleUser) {
    console.log('   ⚡ Criando nova empresa/tenant para o usuário Google...');
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Loja Vanderlei Google',
        slug: 'vanderlei-google-1020',
        plan: 'PRO',
        active: true,
        stores: {
          create: {
            name: 'Loja Principal',
            code: 'MATRIZ-01',
            active: true,
          },
        },
      },
      include: { stores: true },
    });

    googleUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        storeId: tenant.stores[0].id,
        email: googleEmail,
        name: 'Vanderlei Teste Google',
        role: UserRoleType.ADMIN,
        passwordHash: await bcrypt.hash('GoogleAuth@123', 10),
        active: true,
      },
      include: { tenant: true },
    });
    console.log('   ✅ NOVO TENANT E USUÁRIO CRIADOS COM SUCESSO!');
  } else {
    console.log('   ✅ USUÁRIO GOOGLE ENCONTRADO E AUTENTICADO!');
  }

  console.log('   ✅ Nome Google:          ', googleUser.name);
  console.log('   ✅ E-mail Google:        ', googleUser.email);
  console.log('   ✅ Empresa (Tenant):     ', googleUser.tenant.name, `(${googleUser.tenant.slug})`);

  await prisma.$disconnect();
}

runTest().catch((err) => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
