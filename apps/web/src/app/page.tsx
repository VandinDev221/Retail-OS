'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Boxes,
  FileText,
  CreditCard,
  CheckCircle,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  ChevronDown,
  ArrowRight,
  Store,
  Users,
  Award,
  HelpCircle,
  MessageCircle,
  Sparkles,
  BarChart3,
  Check,
} from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isElectron = navigator.userAgent.toLowerCase().includes('electron') || (window as any).electron;
      if (isElectron) {
        if (!loading && user) {
          if (user.role === 'SUPER_ADMIN') window.location.href = '/super-admin';
          else if (user.role === 'CAIXA') window.location.href = '/pos';
          else window.location.href = '/dashboard';
        } else if (!loading && !user) {
          window.location.href = '/login';
        }
      }
    }
  }, [user, loading]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'O RetailSyn precisa ser instalado no computador ou funciona no celular?',
      a: 'O RetailSyn é 100% em nuvem (SaaS). Você pode utilizar diretamente pelo navegador em qualquer computador, notebook, tablet ou smartphone (Android / iOS) sem precisar instalar nada.',
    },
    {
      q: 'Como funciona a emissão de notas fiscais (NFC-e e NF-e)?',
      a: 'A plataforma é integrada diretamente com os serviços de transmissão SEFAZ. Ao concluir uma venda no PDV ou emitir uma nota de saída, o sistema transmite os dados com 1 clique e gera o XML e DANFE imediatamente.',
    },
    {
      q: 'O que é o controle de estoque FEFO (First Expired, First Out)?',
      a: 'É a regra inteligente que organiza as mercadorias pela data de validade mais próxima. Ao realizar uma venda no balcão, o RetailSyn dá baixa automaticamente no lote que vence primeiro, evitando desperdícios e prejuízos.',
    },
    {
      q: 'Como funciona o controle e fechamento cego de caixa?',
      a: 'Ao abrir o caixa, o operador informa o fundo de troco inicial. Durante o dia, é possível registrar sangrias e suprimentos. No fechamento, o operador declara os valores sem ver o esperado (fechamento cego), e o sistema aponta qualquer divergência com exigência de justificativa.',
    },
    {
      q: 'Posso cancelar minha assinatura ou mudar de plano quando quiser?',
      a: 'Sim! Não temos fidelidade nem contrato de permanência. Você pode alterar seu plano ou cancelar a cobrança recorrente a qualquer momento através do Portal do Cliente Stripe no painel.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-zinc-100 font-sans selection:bg-primary-500 selection:text-black">
      {/* 1. NAVBAR / HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-amber-300 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Store className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white">
                Retail<span className="text-primary-400">Syn</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                SaaS 2.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#features" className="hover:text-primary-400 transition">
              Funcionalidades
            </a>
            <a href="#demo" className="hover:text-primary-400 transition">
              Como Funciona
            </a>
            <a href="#pricing" className="hover:text-primary-400 transition">
              Planos & Preços
            </a>
            <a href="#faq" className="hover:text-primary-400 transition">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-300 hover:text-white transition"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-sm shadow-lg shadow-primary-500/20 transition"
            >
              <span>Começar Agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-card border border-surface-border text-xs font-semibold text-primary-400 mb-8 shadow-inner">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span>Gestão Completa de Varejo, Minimercados e Conveniências</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Sua Loja em Outro Nível: <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-300 via-primary-400 to-amber-200">
              PDV, Estoque FEFO, Caixa & Fiscal
            </span>{' '}
            em um Só Lugar.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Controle vendas no balcão em segundos, acompanhe o fluxo de caixa em tempo real, zere perdas de produtos por validade e emita notas fiscais com total praticidade.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-extrabold text-base shadow-xl shadow-primary-500/25 transition transform hover:-translate-y-0.5"
            >
              <span>Experimentar Gratuitamente</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-200 font-bold text-base border border-surface-border transition"
            >
              <span>Ver Como Funciona</span>
            </a>
          </div>

          {/* Key Metrics Badges */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-surface/80 border border-surface-border backdrop-blur">
              <Zap className="w-6 h-6 text-primary-400 mb-2 mx-auto" />
              <div className="text-xl font-bold text-white">PDV Ultrarrápido</div>
              <div className="text-xs text-zinc-400">Venda no balcão em segundos</div>
            </div>
            <div className="p-4 rounded-xl bg-surface/80 border border-surface-border backdrop-blur">
              <Boxes className="w-6 h-6 text-emerald-400 mb-2 mx-auto" />
              <div className="text-xl font-bold text-white">Algoritmo FEFO</div>
              <div className="text-xs text-zinc-400">Baixa inteligente por validade</div>
            </div>
            <div className="p-4 rounded-xl bg-surface/80 border border-surface-border backdrop-blur">
              <CreditCard className="w-6 h-6 text-amber-400 mb-2 mx-auto" />
              <div className="text-xl font-bold text-white">Fechamento Cego</div>
              <div className="text-xs text-zinc-400">Conciliação estrita de caixa</div>
            </div>
            <div className="p-4 rounded-xl bg-surface/80 border border-surface-border backdrop-blur">
              <FileText className="w-6 h-6 text-blue-400 mb-2 mx-auto" />
              <div className="text-xl font-bold text-white">NFC-e & NF-e</div>
              <div className="text-xs text-zinc-400">Emissão direta na SEFAZ</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SYSTEM DEMO PREVIEW (MOCKUP INTERATIVO) */}
      <section id="demo" className="py-20 bg-surface/50 border-y border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-white tracking-tight">Veja como o RetailSyn funciona por dentro</h2>
            <p className="mt-3 text-zinc-400">
              Interface moderna, intuitiva e pensada para a agilidade do operador de caixa e tomada de decisão do dono da loja.
            </p>
          </div>

          {/* Window Mockup Frame */}
          <div className="rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden">
            {/* Top Bar */}
            <div className="px-4 py-3 bg-surface-card border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 text-xs font-mono text-zinc-500">app.retailsyn.com.br/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Caixa Aberto — Operador 01</span>
              </div>
            </div>

            {/* Dashboard Mockup Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Fake Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-surface-card rounded-xl border border-surface-border">
                  <div className="text-xs text-zinc-400">Faturamento Hoje</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">R$ 3.840,50</div>
                  <div className="text-[11px] text-zinc-500 mt-2">↑ 18% em relação a ontem</div>
                </div>
                <div className="p-5 bg-surface-card rounded-xl border border-surface-border">
                  <div className="text-xs text-zinc-400">Vendas no Balcão</div>
                  <div className="text-2xl font-black text-white font-mono mt-1">42 atendimentos</div>
                  <div className="text-[11px] text-zinc-500 mt-2">Ticket médio: R$ 91,44</div>
                </div>
                <div className="p-5 bg-surface-card rounded-xl border border-surface-border">
                  <div className="text-xs text-zinc-400">Lotes a Vencer (FEFO)</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">3 produtos</div>
                  <div className="text-[11px] text-amber-500/80 mt-2">Próximo vencimento: 05 dias</div>
                </div>
              </div>

              {/* Fake Recent Sales Table */}
              <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
                <div className="px-5 py-3 border-b border-surface-border text-xs font-bold text-zinc-300 uppercase tracking-wider flex justify-between items-center">
                  <span>Últimas Vendas no PDV</span>
                  <span className="text-primary-400 font-mono text-[10px]">Emissão NFC-e Automática</span>
                </div>
                <div className="divide-y divide-surface-border text-xs">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">VND-000428</div>
                      <div className="text-zinc-500">2x Bebida Energética, 1x Snack Salgado</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">R$ 34,90</div>
                      <div className="text-[10px] text-zinc-400">PIX · NFC-e Autorizada</div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between bg-surface-card/40">
                    <div>
                      <div className="font-bold text-white">VND-000427</div>
                      <div className="text-zinc-500">1x Café Premium 500g (Lote FEFO #0412)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">R$ 28,50</div>
                      <div className="text-[10px] text-zinc-400">Cartão de Débito</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PASSOS DE FUNCIONAMENTO */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">Passo a Passo</span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-2">
              Do cadastro ao primeiro cupom fiscal em minutos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative p-6 bg-surface-card rounded-2xl border border-surface-border">
              <div className="w-10 h-10 rounded-xl bg-primary-500 text-black font-black text-lg flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cadastre sua Loja</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Crie sua conta no sistema com os dados da sua empresa ou loja física em menos de 2 minutos.
              </p>
            </div>

            <div className="relative p-6 bg-surface-card rounded-2xl border border-surface-border">
              <div className="w-10 h-10 rounded-xl bg-primary-500 text-black font-black text-lg flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cadastre Produtos & Lotes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Defina preços de venda, estoque mínimo, datas de validade e dados tributários (NCM / CFOP).
              </p>
            </div>

            <div className="relative p-6 bg-surface-card rounded-2xl border border-surface-border">
              <div className="w-10 h-10 rounded-xl bg-primary-500 text-black font-black text-lg flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Abra o Caixa e Opere o PDV</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Registre fundos de troco, venda por leitor de código de barras ou atalhos e receba via PIX, Cartão ou Dinheiro.
              </p>
            </div>

            <div className="relative p-6 bg-surface-card rounded-2xl border border-surface-border">
              <div className="w-10 h-10 rounded-xl bg-primary-500 text-black font-black text-lg flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Emita Notas e Analise Lucros</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Emita cupons fiscais com 1 clique e acompanhe gráficos de margem de lucro e custo médio ponderado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TUDO O QUE VOCÊ GANHA (RECURSOS E REGRAS DE NEGÓCIO) */}
      <section id="features" className="py-24 bg-surface/50 border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">Recursos Inclusos</span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-2">
              Tudo o que sua loja precisa para crescer sem prejuízos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-surface-card rounded-2xl border border-surface-border hover:border-primary-500/50 transition">
              <ShoppingCart className="w-8 h-8 text-primary-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Frente de Caixa (PDV)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Checkout rápido com atalhos de teclado, suporte a leitor de código de barras, pagamentos mistos e idempotência contra cobrança duplicada.
              </p>
            </div>

            <div className="p-6 bg-surface-card rounded-2xl border border-surface-border hover:border-primary-500/50 transition">
              <Boxes className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Algoritmo FEFO & Validade</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dedução automática de estoque baseada nos lotes que vencem primeiro. Evite perdas por produtos vencidos na prateleira.
              </p>
            </div>

            <div className="p-6 bg-surface-card rounded-2xl border border-surface-border hover:border-primary-500/50 transition">
              <CreditCard className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Fechamento Cego de Caixa</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Abertura com troco inicial, suprimentos, sangria de segurança e conciliação cega com justificativa obrigatória em divergências.
              </p>
            </div>

            <div className="p-6 bg-surface-card rounded-2xl border border-surface-border hover:border-primary-500/50 transition">
              <TrendingUp className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Compras & Custo Médio</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Entrada de mercadorias com fornecedores e recálculo automático do Custo Médio Ponderado a cada nota recebida.
              </p>
            </div>

            <div className="p-6 bg-surface-card rounded-2xl border border-surface-border hover:border-primary-500/50 transition">
              <FileText className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Emissão Fiscal (NFC-e / NF-e)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Emissão direta para a SEFAZ com geração automática de XML, DANFE, número de protocolo e chave de acesso de 44 dígitos.
              </p>
            </div>

            <div className="p-6 bg-surface-card rounded-2xl border border-surface-border hover:border-primary-500/50 transition">
              <ShieldCheck className="w-8 h-8 text-rose-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Multi-tenant & Segurança RBAC</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Isolamento total de dados entre empresas, permissões por função (Gerente, Caixa, Estoquista) e registro de logs de auditoria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PLANOS E PREÇOS */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">Planos & Investimento</span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-2">
              Escolha o plano ideal para a sua loja
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Sem taxas escondidas ou surpresas na fatura. Troque de plano ou cancele a qualquer momento.
            </p>

            {/* Billing Switcher */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-xl bg-surface-card border border-surface-border">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                  billingCycle === 'MONTHLY' ? 'bg-surface text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition ${
                  billingCycle === 'YEARLY' ? 'bg-primary-500 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Cobrança Anual</span>
                <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-black uppercase tracking-wider">
                  -20% OFF
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* PLANO STARTER */}
            <div className="p-8 bg-surface-card rounded-2xl border border-surface-border flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <h3 className="text-xl font-bold text-white">RetailSyn Starter</h3>
                <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">Ideal para 1 loja de conveniência ou minimercado.</p>

                <div className="my-6 py-4 border-y border-surface-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {billingCycle === 'YEARLY' ? 'R$ 1.499,99' : 'R$ 159,99'}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      /{billingCycle === 'YEARLY' ? 'ano' : 'mês'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {billingCycle === 'YEARLY' ? 'Equivalente a R$ 124,99/mês' : 'Faturamento mensal sem fidelidade'}
                  </span>
                </div>

                <ul className="text-xs text-zinc-300 space-y-3 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Até <strong>1 Loja</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Até <strong>5 Usuários</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Até <strong>5.000 Produtos</strong> Cadastrados</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>PDV & Fechamento Cego de Caixa</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Controle de Estoque & Validade FEFO</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full text-center py-3 px-4 rounded-xl bg-surface hover:bg-surface-border text-white font-bold text-xs border border-surface-border transition shadow"
              >
                Começar com Starter
              </Link>
            </div>

            {/* PLANO PRO (MAIS POPULAR) */}
            <div className="relative p-8 bg-surface-card rounded-2xl border-2 border-primary-500 shadow-2xl shadow-primary-500/10 flex flex-col justify-between transform md:-translate-y-2">
              <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-primary-500 text-black font-black text-[10px] uppercase tracking-wider shadow">
                Mais Popular
              </span>

              <div>
                <h3 className="text-xl font-bold text-white">RetailSyn Pro</h3>
                <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">Para redes de até 3 lojas com módulo fiscal.</p>

                <div className="my-6 py-4 border-y border-surface-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {billingCycle === 'YEARLY' ? 'R$ 1.999,99' : 'R$ 249,99'}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      /{billingCycle === 'YEARLY' ? 'ano' : 'mês'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {billingCycle === 'YEARLY' ? 'Equivalente a R$ 166,66/mês' : 'Faturamento mensal sem fidelidade'}
                  </span>
                </div>

                <ul className="text-xs text-zinc-300 space-y-3 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-400 shrink-0" />
                    <span>Até <strong>3 Lojas</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-400 shrink-0" />
                    <span>Até <strong>30 Usuários</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-400 shrink-0" />
                    <span>Até <strong>10.000 Produtos</strong> Cadastrados</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-400 shrink-0" />
                    <span><strong>Emissão Fiscal NFC-e e NF-e (SEFAZ)</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-400 shrink-0" />
                    <span>PDV + FEFO + Compras & Custo Médio</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full text-center py-3.5 px-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-extrabold text-xs shadow-lg shadow-primary-500/20 transition"
              >
                Assinar Plano Pro
              </Link>
            </div>

            {/* PLANO INTERPRISE */}
            <div className="p-8 bg-surface-card rounded-2xl border border-surface-border flex flex-col justify-between hover:border-zinc-700 transition">
              <div>
                <h3 className="text-xl font-bold text-white">RetailSyn Interprise</h3>
                <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">Ideal para grandes redes, lojas e usuários ilimitados.</p>

                <div className="my-6 py-4 border-y border-surface-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {billingCycle === 'YEARLY' ? 'R$ 3.999,99' : 'R$ 499,99'}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      /{billingCycle === 'YEARLY' ? 'ano' : 'mês'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {billingCycle === 'YEARLY' ? 'Equivalente a R$ 333,33/mês' : 'Faturamento mensal sem fidelidade'}
                  </span>
                </div>

                <ul className="text-xs text-zinc-300 space-y-3 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Até <strong>10 Lojas</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Até <strong>100 Usuários</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Produtos Ilimitados</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Todos os Módulos (PDV, Fiscal, FEFO, Financeiro)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Suporte Prioritário VIP 24/7</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full text-center py-3 px-4 rounded-xl bg-surface hover:bg-surface-border text-white font-bold text-xs border border-surface-border transition shadow"
              >
                Assinar Interprise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ (PERGUNTAS FREQUENTES) */}
      <section id="faq" className="py-24 bg-surface/50 border-t border-surface-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">Tire Suas Dúvidas</span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-2">Perguntas Frequentes</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-surface-card border border-surface-border rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-primary-400 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180 text-primary-400' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-surface-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA FINAL */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="p-10 md:p-14 bg-gradient-to-b from-surface-card to-surface rounded-3xl border border-surface-border shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Pronto para profissionalizar o controle da sua loja?
            </h2>
            <p className="mt-4 text-sm text-zinc-400 max-w-xl mx-auto">
              Configure sua conta em menos de 2 minutos, organize seu frente de caixa e elimine perdas de estoque por validade.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-extrabold text-base shadow-xl shadow-primary-500/20 transition transform hover:-translate-y-0.5"
              >
                <span>Criar Minha Conta Agora</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-300 font-bold text-base border border-surface-border transition"
              >
                <span>Já Tenho Conta</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-surface-border py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Store className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-base text-white">
              Retail<span className="text-primary-400">Syn</span>
            </span>
          </div>

          <div className="text-xs text-zinc-500">
            © {new Date().getFullYear()} RetailSyn SaaS. Todos os direitos reservados.
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400 font-medium">
            <Link href="/login" className="hover:text-white transition">
              Termos de Uso
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Política de Privacidade
            </Link>
            <a
              href="https://wa.me/5598985894988?text=Ol%C3%A1!%20Tenho%20d%C3%BAvidas%20sobre%20o%20RetailSyn."
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Suporte WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
