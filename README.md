# 🛒 RetailSyn - Sistema de Gestão de Estoque, Vendas (PDV) e SaaS Multi-Tenant

**RetailSyn** é uma plataforma SaaS moderna de gestão comercial multi-tenant desenvolvida para lojas de conveniência, minimercados e redes de varejo. O sistema integra controle de estoque inteligente com algoritmo FEFO (First Expired, First Out), frente de caixa (PDV), gestão financeira, compras, emissão fiscal (NFe/NFCe) e faturamento de assinaturas via **Stripe Checkout & Customer Portal**.

---

## 🚀 Tecnologias Utilizadas

### **Arquitetura Monorepo (Turborepo + pnpm)**
- **Frontend (`apps/web`):** Next.js 14 (App Router), React, TailwindCSS, TanStack React Query, Lucide Icons.
- **Backend (`apps/api`):** NestJS, TypeScript, Prisma ORM, PostgreSQL (Neon Database), Passport JWT, Bcrypt.
- **Pacotes Compartilhados (`packages/shared`):** Enums, Constantes, Utilitários e Schemas reutilizáveis.
- **Integração de Pagamento:** Stripe API (Checkout & Customer Portal).

---

## 🛠️ Principais Módulos & Funcionalidades

### 👑 **1. Painel Super Admin (SaaS)**
- Rota exclusiva de gerenciamento global (`/super-admin`).
- Gestão de empresas contratantes (Tenants), usuários e permissões da plataforma.
- Monitoramento de logs de infraestrutura e auditoria do sistema.
- Exclusão e desativação em cascata segura de empresas.

### 💳 **2. Planos de Assinatura & Faturamento Stripe**
- **RetailSyn Plano Starter:**
  - Ideal para 1 loja de conveniência ou minimercado individual.
  - R$ 159,99 /mês (ou R$ 1.499,99 /ano).
  - Limite: 1 Loja, 3 Usuários, 1000 Produtos Cadastrados.
- **RetailSyn Plano Pro:**
  - Para redes de até 3 lojas.
  - R$ 249,99 /mês (ou R$ 1.999,99 /ano).
  - Limite: 3 Lojas, 10 Usuários, 1000 Produtos Cadastrados.
- Gestão de cartão de crédito e faturas diretamente pelo **Stripe Customer Portal**.

### 🛒 **3. Frente de Caixa (PDV) & Controle de Caixa**
- Ponto de Venda ágil (`/pos`) com busca por código de barras ou SKU.
- Abertura, fechamento, reforço (suprimento) e sangria de caixa (`/cash`).
- Suporte a múltiplos métodos de pagamento (PIX, Dinheiro, Cartão de Crédito/Débito, Fiado/Crédito da Loja).

### 📦 **4. Gestão de Estoque & Algoritmo FEFO**
- Controle de estoque por lote e data de validade (`/inventory`).
- Baixa automática priorizando produtos com data de expiração mais próxima (**FEFO - First Expired, First Out**).
- Contagem e balanço de inventário com relatórios de perdas e divergências.

### 🚚 **5. Compras & Entrada de Mercadorias**
- Cadastro de fornecedores e pedidos de compra (`/purchases`).
- Entrada e recebimento de mercadorias com atualização automática de saldo e custo médio.

### 🧾 **6. Emissão Fiscal & Documentos**
- Emissão e monitoramento de NFe e NFCe (`/fiscal`).
- Histórico de documentos fiscais autorizados, rejeitados ou cancelados.

### 💰 **7. Módulo Financeiro & Relatórios**
- Controle de Contas a Pagar e Contas a Receber (`/finance`).
- Relatórios analíticos de vendas, margem de lucro e curva ABC de produtos (`/reports`).

### 🔒 **8. Segurança, RBAC & Auditoria**
- Controle de acesso baseado em papéis (SUPER_ADMIN, ADMIN, GERENTE, CAIXA, ESTOQUISTA, VENDEDOR).
- Logs de auditoria gravando ações, usuários, IP de origem e timestamp.
- Restrição estrita de logs de auditoria exclusivamente para a conta Superadmin.

---

## ⚙️ Instalação e Execução Local

### **Pré-requisitos**
- Node.js (v18+)
- pnpm (v9+)
- Banco de dados PostgreSQL (ex: Neon DB)

### **1. Clonar o repositório**
```bash
git clone https://github.com/VandinDev221/Retail-OS.git
cd Retail-OS
```

### **2. Instalar dependências**
```bash
pnpm install
```

### **3. Configurar Variáveis de Ambiente**
Crie um arquivo `.env` dentro de `apps/api` com as seguintes chaves:
```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

DATABASE_URL="postgresql://usuario:senha@host/neondb?sslmode=require"
DIRECT_URL="postgresql://usuario:senha@host/neondb?sslmode=require"

JWT_SECRET="seu-jwt-secret-minimo-32-caracteres"
JWT_REFRESH_SECRET="seu-jwt-refresh-secret-minimo-32-caracteres"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:3000"
```

### **4. Preparar o Banco de Dados**
```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

### **5. Executar a aplicação em Modo de Desenvolvimento**
```bash
pnpm run dev
```
- **Frontend (Web):** `http://localhost:3000`
- **Backend (API NestJS):** `http://localhost:4000/api/v1`
- **Documentação Swagger API:** `http://localhost:4000/api/docs`

---

## 🏗️ Build de Produção

Para testar a compilação completa do monorepo:
```bash
pnpm run build
```

---

## 📜 Licença
Este projeto é privado e proprietário da **RetailSyn**. Todos os direitos reservados.
