import { PrismaClient, UserRoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'products:read', name: 'Visualizar Produtos', module: 'Produtos' },
  { key: 'products:create', name: 'Criar Produtos', module: 'Produtos' },
  { key: 'products:update', name: 'Atualizar Produtos', module: 'Produtos' },
  { key: 'products:delete', name: 'Excluir Produtos', module: 'Produtos' },
  { key: 'stock:read', name: 'Visualizar Estoque', module: 'Estoque' },
  { key: 'stock:adjust', name: 'Ajustar Estoque', module: 'Estoque' },
  { key: 'stock:inventory', name: 'Realizar Inventário', module: 'Estoque' },
  { key: 'stock:lots', name: 'Gerenciar Lotes', module: 'Estoque' },
  { key: 'purchases:read', name: 'Visualizar Compras', module: 'Compras' },
  { key: 'purchases:create', name: 'Criar Pedido de Compra', module: 'Compras' },
  { key: 'purchases:receive', name: 'Receber Mercadorias', module: 'Compras' },
  { key: 'purchases:cancel', name: 'Cancelar Pedido de Compra', module: 'Compras' },
  { key: 'sales:read', name: 'Visualizar Vendas', module: 'Vendas' },
  { key: 'sales:create', name: 'Realizar Venda (PDV)', module: 'Vendas' },
  { key: 'sales:cancel', name: 'Cancelar Venda', module: 'Vendas' },
  { key: 'sales:refund', name: 'Devolver Venda', module: 'Vendas' },
  { key: 'sales:discount', name: 'Aplicar Desconto', module: 'Vendas' },
  { key: 'cash:open', name: 'Abrir Caixa', module: 'Caixa' },
  { key: 'cash:close', name: 'Fechar Caixa', module: 'Caixa' },
  { key: 'cash:supply', name: 'Suprimento de Caixa', module: 'Caixa' },
  { key: 'cash:sangria', name: 'Sangria de Caixa', module: 'Caixa' },
  { key: 'cash:view_blind_closure', name: 'Ver Relatório Fechamento', module: 'Caixa' },
  { key: 'customers:read', name: 'Visualizar Clientes', module: 'Clientes' },
  { key: 'customers:write', name: 'Gerenciar Clientes', module: 'Clientes' },
  { key: 'suppliers:read', name: 'Visualizar Fornecedores', module: 'Fornecedores' },
  { key: 'suppliers:write', name: 'Gerenciar Fornecedores', module: 'Fornecedores' },
  { key: 'finance:read', name: 'Visualizar Financeiro', module: 'Financeiro' },
  { key: 'finance:payables', name: 'Contas a Pagar', module: 'Financeiro' },
  { key: 'finance:receivables', name: 'Contas a Receber', module: 'Financeiro' },
  { key: 'fiscal:emit', name: 'Emitir Fiscal', module: 'Fiscal' },
  { key: 'fiscal:cancel', name: 'Cancelar Fiscal', module: 'Fiscal' },
  { key: 'fiscal:manage', name: 'Configuração Fiscal', module: 'Fiscal' },
  { key: 'reports:sales', name: 'Relatório de Vendas', module: 'Relatórios' },
  { key: 'reports:stock', name: 'Relatório de Estoque', module: 'Relatórios' },
  { key: 'reports:cash', name: 'Relatório de Caixa', module: 'Relatórios' },
  { key: 'reports:finance', name: 'Relatório Financeiro', module: 'Relatórios' },
  { key: 'users:manage', name: 'Gerenciar Usuários', module: 'Administração' },
  { key: 'roles:manage', name: 'Gerenciar Perfis', module: 'Administração' },
  { key: 'stores:manage', name: 'Gerenciar Lojas', module: 'Administração' },
  { key: 'settings:manage', name: 'Configurações Globais', module: 'Administração' },
  { key: 'audit:read', name: 'Visualizar Auditoria', module: 'Auditoria' },
];

async function main() {
  console.log('🚀 Iniciando Seed do RetailSyn (Planos, Permissões e Lojas)...');

  // 0. Criar / Atualizar Planos de Assinatura SaaS
  const planStarter = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {
      name: 'RetailSyn Plano Starter',
      description: 'Ideal para 1 loja de conveniência ou minimercado individual.',
      priceMonthly: 159.99,
      priceYearly: 1499.99,
      maxStores: 1,
      maxUsers: 3,
      maxProducts: 1000,
      active: true,
    },
    create: {
      name: 'RetailSyn Plano Starter',
      slug: 'starter',
      description: 'Ideal para 1 loja de conveniência ou minimercado individual.',
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
    update: {
      name: 'RetailSyn Plano Pro',
      description: 'Para redes de até 3 lojas',
      priceMonthly: 249.99,
      priceYearly: 1999.99,
      maxStores: 3,
      maxUsers: 10,
      maxProducts: 1000,
      active: true,
    },
    create: {
      name: 'RetailSyn Plano Pro',
      slug: 'pro',
      description: 'Para redes de até 3 lojas',
      priceMonthly: 249.99,
      priceYearly: 1999.99,
      maxStores: 3,
      maxUsers: 10,
      maxProducts: 1000,
      active: true,
    },
  });

  // Deativar outros planos antigos se existirem
  await prisma.plan.updateMany({
    where: {
      slug: { notIn: ['starter', 'pro'] },
    },
    data: { active: false },
  });

  console.log('✅ Planos SaaS configurados: RetailSyn Plano Starter (R$ 159,99) e RetailSyn Plano Pro (R$ 249,99)');

  // 1. Criar ou atualizar Tenant principal
  let tenant = await prisma.tenant.findUnique({
    where: { slug: 'loja-matriz' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Conveniência & Mercado Matriz',
        slug: 'loja-matriz',
        cnpj: '12.345.678/0001-90',
        phone: '(11) 98765-4321',
        email: 'contato@lojamatriz.com.br',
        plan: 'ENTERPRISE',
        active: true,
      },
    });
    console.log(`✅ Tenant criado: ${tenant.name} (${tenant.id})`);
  }

  // 2. Criar Loja padrão
  let store = await prisma.store.findFirst({
    where: { tenantId: tenant.id, name: 'Loja 01 - Centro' },
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        tenantId: tenant.id,
        name: 'Loja 01 - Centro',
        code: 'LJ01',
        address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        phone: '(11) 3333-4444',
      },
    });
    console.log(`✅ Loja criada: ${store.name}`);
  }

  // 3. Localização de estoque padrão
  let stockLocation = await prisma.stockLocation.findFirst({
    where: { storeId: store.id, name: 'Estoque Principal' },
  });

  if (!stockLocation) {
    stockLocation = await prisma.stockLocation.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        name: 'Estoque Principal',
        isDefault: true,
      },
    });
    console.log(`✅ Local de Estoque criado: ${stockLocation.name}`);
  }

  // 4. Terminal e Caixa
  let terminal = await prisma.terminal.findFirst({
    where: { storeId: store.id, code: 'CX01' },
  });

  if (!terminal) {
    terminal = await prisma.terminal.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        name: 'Terminal 01 - Frente de Caixa',
        code: 'CX01',
      },
    });
    console.log(`✅ Terminal criado: ${terminal.name}`);
  }

  let cashRegister = await prisma.cashRegister.findFirst({
    where: { storeId: store.id, name: 'Gaveta PDV 01' },
  });

  if (!cashRegister) {
    cashRegister = await prisma.cashRegister.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        terminalId: terminal.id,
        name: 'Gaveta PDV 01',
      },
    });
    console.log(`✅ Caixa Registrador criado: ${cashRegister.name}`);
  }

  // 5. Permissões
  console.log('📌 Criando Permissões...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: perm.key,
        },
      },
      update: { name: perm.name, module: perm.module },
      create: {
        tenantId: tenant.id,
        key: perm.key,
        name: perm.name,
        module: perm.module,
      },
    });
  }

  const allPerms = await prisma.permission.findMany({
    where: { tenantId: tenant.id },
  });

  // 6. Perfis (Roles)
  console.log('📌 Criando Perfis...');
  const roleTypes = Object.values(UserRoleType);
  for (const rType of roleTypes) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: rType,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: rType,
        description: `Perfil padrão de ${rType}`,
        isSystem: true,
      },
    });

    // Vincular permissões ao SUPER_ADMIN / ADMIN
    if (role && (rType === UserRoleType.SUPER_ADMIN || rType === UserRoleType.ADMIN)) {
      for (const p of allPerms) {
        if (p?.id && role?.id) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: p.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: p.id,
            },
          });
        }
      }
    }
  }

  // 7. Usuário Super Admin (Desvinculado de empresa)
  let devVandersonUser = await prisma.user.findUnique({ where: { email: 'lindosovanderson@gmail.com' } });
  if (devVandersonUser) {
    devVandersonUser = await prisma.user.update({
      where: { id: devVandersonUser.id },
      data: {
        passwordHash: '$2a$12$9VchAnM.xlMPr16tGTNIXu3G6QCphVj1nGt46oOfM6BVZ6kzNQ.jC',
        name: 'DevVanderson',
        role: UserRoleType.SUPER_ADMIN,
        tenantId: null,
        storeId: null,
        active: true,
      },
    });
  } else {
    devVandersonUser = await prisma.user.create({
      data: {
        tenantId: null,
        storeId: null,
        email: 'lindosovanderson@gmail.com',
        name: 'DevVanderson',
        passwordHash: '$2a$12$9VchAnM.xlMPr16tGTNIXu3G6QCphVj1nGt46oOfM6BVZ6kzNQ.jC',
        role: UserRoleType.SUPER_ADMIN,
        active: true,
      },
    });
  }
  console.log(`✅ Usuário Super Admin criado: ${devVandersonUser.email}`);

  // Operador de Caixa de Teste
  const cashierPasswordHash = await bcrypt.hash('Caixa@123456', 10);
  await prisma.user.upsert({
    where: {
      email: 'caixa@retailos.com',
    },
    update: {},
    create: {
      tenantId: tenant.id,
      storeId: store.id,
      email: 'caixa@retailos.com',
      name: 'Operador de Caixa 01',
      passwordHash: cashierPasswordHash,
      role: UserRoleType.CAIXA,
    },
  });

  // 8. Categorias, Marcas e Unidades
  const catBebidas = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Bebidas' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Bebidas' },
  });

  const catSnacks = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Snacks & Salgados' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Snacks & Salgados' },
  });

  const catDoces = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Doces & Chocolates' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Doces & Chocolates' },
  });

  const brandCoca = await prisma.brand.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Coca-Cola' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Coca-Cola' },
  });

  const brandHeineken = await prisma.brand.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Heineken' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Heineken' },
  });

  const brandElma = await prisma.brand.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Elma Chips' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Elma Chips' },
  });

  const unitUn = await prisma.unit.upsert({
    where: { tenantId_symbol: { tenantId: tenant.id, symbol: 'UN' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Unidade', symbol: 'UN' },
  });

  // Fornecedor de teste
  const supplierAmbev = await prisma.supplier.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Distribuidora Ambev SP' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Distribuidora Ambev SP',
      tradeName: 'Ambev Distribuição',
      document: '02.808.708/0001-07',
      email: 'pedidos@ambevdist.com.br',
      phone: '(11) 4004-1000',
    },
  });

  // Cliente padrão consumidor final
  await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: 'Consumidor Final / Balcão',
      document: '000.000.000-00',
    },
  });

  // 9. Produtos de Exemplo com Lotes e Estoque
  const sampleProducts = [
    {
      name: 'Refrigerante Coca-Cola Lata 350ml',
      sku: 'BEB-COC-350',
      barcode: '7894900011517',
      categoryId: catBebidas.id,
      brandId: brandCoca.id,
      unitId: unitUn.id,
      costPrice: 2.80,
      salePrice: 5.50,
      minStock: 24,
      trackLots: true,
      lots: [
        { lotNumber: 'L-COC-001', daysToExpire: 180, qty: 50, cost: 2.80 },
        { lotNumber: 'L-COC-002', daysToExpire: 10, qty: 15, cost: 2.80 }, // Vencendo logo para testar FEFO
      ]
    },
    {
      name: 'Cerveja Heineken Long Neck 330ml',
      sku: 'BEB-HEI-330',
      barcode: '7896045506047',
      categoryId: catBebidas.id,
      brandId: brandHeineken.id,
      unitId: unitUn.id,
      costPrice: 4.50,
      salePrice: 8.90,
      minStock: 30,
      trackLots: true,
      lots: [
        { lotNumber: 'L-HEI-001', daysToExpire: 90, qty: 48, cost: 4.50 },
      ]
    },
    {
      name: 'Salgadinho Doritos Queijo Nacho 84g',
      sku: 'SNK-DOR-84',
      barcode: '7892840813735',
      categoryId: catSnacks.id,
      brandId: brandElma.id,
      unitId: unitUn.id,
      costPrice: 5.20,
      salePrice: 9.99,
      minStock: 15,
      trackLots: true,
      lots: [
        { lotNumber: 'L-DOR-001', daysToExpire: 45, qty: 30, cost: 5.20 },
      ]
    },
    {
      name: 'Água Mineral Crystal Sem Gás 500ml',
      sku: 'BEB-AGU-500',
      barcode: '7894900530018',
      categoryId: catBebidas.id,
      brandId: brandCoca.id,
      unitId: unitUn.id,
      costPrice: 1.10,
      salePrice: 3.00,
      minStock: 40,
      trackLots: false,
      initialQty: 100,
    },
  ];

  console.log('📌 Cadastrando Produtos e Lotes de Estoque...');
  for (const item of sampleProducts) {
    const product = await prisma.product.upsert({
      where: {
        tenantId_barcode: {
          tenantId: tenant.id,
          barcode: item.barcode,
        },
      },
      update: {
        costPrice: item.costPrice,
        salePrice: item.salePrice,
      },
      create: {
        tenantId: tenant.id,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        categoryId: item.categoryId,
        brandId: item.brandId,
        unitId: item.unitId,
        costPrice: item.costPrice,
        salePrice: item.salePrice,
        minStock: item.minStock,
        trackLots: item.trackLots,
      },
    });

    let totalStock = 0;

    if (item.lots) {
      for (const lot of item.lots) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + lot.daysToExpire);

        const existingLot = await prisma.stockLot.findFirst({
          where: {
            tenantId: tenant.id,
            productId: product.id,
            lotNumber: lot.lotNumber,
          },
        });

        if (!existingLot) {
          await prisma.stockLot.create({
            data: {
              tenantId: tenant.id,
              storeId: store.id,
              productId: product.id,
              supplierId: supplierAmbev.id,
              lotNumber: lot.lotNumber,
              expirationDate: expDate,
              quantity: lot.qty,
              costPrice: lot.cost,
            },
          });
        }
        totalStock += lot.qty;
      }
    } else if (item.initialQty) {
      totalStock = item.initialQty;
    }

    // Atualizar StockBalance
    await prisma.stockBalance.upsert({
      where: {
        storeId_locationId_productId: {
          storeId: store.id,
          locationId: stockLocation.id,
          productId: product.id,
        },
      },
      update: { quantity: totalStock },
      create: {
        tenantId: tenant.id,
        storeId: store.id,
        locationId: stockLocation.id,
        productId: product.id,
        quantity: totalStock,
      },
    });
  }

  console.log('✅ Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
