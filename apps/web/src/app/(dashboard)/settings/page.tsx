'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import {
  Settings,
  Users,
  Shield,
  History,
  Store,
  CreditCard,
  Zap,
  CheckCircle,
  ExternalLink,
  Crown,
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'users' | 'tenant' | 'subscription' | 'audit'>('users');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const res = await api.get('/tenants/current');
      return res.data;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/my-subscription');
      return res.data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/plans');
      return res.data;
    },
  });

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit');
      return res.data;
    },
    enabled: tab === 'audit',
  });

  // Mutation para Checkout na Stripe
  const stripeCheckoutMutation = useMutation({
    mutationFn: async (planSlug: string) => {
      const res = await api.post('/subscriptions/stripe/create-checkout-session', {
        planSlug,
        billingCycle,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  // Mutation para abrir Portal do Cliente na Stripe
  const stripePortalMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/subscriptions/stripe/portal-session');
      return res.data;
    },
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações & Administração</h1>
        <p className="text-sm text-zinc-400">Usuários, permissões RBAC, plano de assinatura Stripe e auditoria</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border gap-2 overflow-x-auto">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            tab === 'users'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários & Operadores</span>
        </button>
        <button
          onClick={() => setTab('tenant')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            tab === 'tenant'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Dados da Loja / Empresa</span>
        </button>
        <button
          onClick={() => setTab('subscription')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            tab === 'subscription'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Crown className="w-4 h-4 text-primary-400" />
          <span>Assinatura & Planos Stripe</span>
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            tab === 'audit'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Logs de Auditoria</span>
        </button>
      </div>

      {/* ABA USUARIOS */}
      {tab === 'users' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Perfil (Role)</th>
                  <th className="p-4">Criado em</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : (
                  users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-bold text-zinc-100">{u.name}</td>
                      <td className="p-4 font-mono text-zinc-300">{u.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-primary-500/15 text-primary-400 font-bold text-[10px] uppercase border border-primary-500/30">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-zinc-400">{formatDate(u.createdAt)}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA TENANT */}
      {tab === 'tenant' && (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-white">Dados Cadastrais da Empresa</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-surface-card rounded-xl border border-surface-border">
              <span className="text-zinc-400 font-semibold">Razão Social / Nome:</span>
              <p className="text-sm font-bold text-zinc-100 mt-1">{tenant?.name}</p>
            </div>
            <div className="p-3 bg-surface-card rounded-xl border border-surface-border">
              <span className="text-zinc-400 font-semibold">Slug do Tenant:</span>
              <p className="text-sm font-mono font-bold text-primary-400 mt-1">{tenant?.slug}</p>
            </div>
            <div className="p-3 bg-surface-card rounded-xl border border-surface-border">
              <span className="text-zinc-400 font-semibold">CNPJ:</span>
              <p className="text-sm font-mono text-zinc-200 mt-1">{tenant?.cnpj || 'Não informado'}</p>
            </div>
            <div className="p-3 bg-surface-card rounded-xl border border-surface-border">
              <span className="text-zinc-400 font-semibold">Plano SaaS:</span>
              <p className="text-sm font-bold text-emerald-400 mt-1">{subscription?.plan?.name || tenant?.plan}</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA ASSINATURAS STRIPE */}
      {tab === 'subscription' && (
        <div className="space-y-6">
          {/* Card de Assinatura Atual */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                Assinatura {subscription?.status || 'ATIVA'}
              </span>
              <h3 className="text-xl font-black text-white">
                {subscription?.plan?.name || 'Plano Pro'}
              </h3>
              <p className="text-xs text-zinc-400">
                Renovação automática em:{' '}
                <strong className="text-zinc-200 font-mono">
                  {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'Em 30 dias'}
                </strong>
              </p>
            </div>

            <button
              onClick={() => stripePortalMutation.mutate()}
              disabled={stripePortalMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-100 font-bold text-xs border border-surface-border transition"
            >
              <CreditCard className="w-4 h-4 text-primary-400" />
              <span>Gerenciar Cartão no Stripe</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>

          {/* Seleção do Ciclo de Cobrança */}
          <div className="flex justify-center my-4">
            <div className="bg-surface-card p-1 rounded-xl border border-surface-border flex gap-1">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  billingCycle === 'MONTHLY' ? 'bg-primary-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  billingCycle === 'YEARLY' ? 'bg-primary-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Cobrança Anual</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                  Desconto 20%
                </span>
              </button>
            </div>
          </div>

          {/* Grid de Planos Disponíveis para Upgrade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans?.map((plan: any) => {
              const isCurrent = subscription?.plan?.slug === plan.slug;
              const price = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

              return (
                <div
                  key={plan.id}
                  className={`bg-surface border rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between ${
                    isCurrent ? 'border-primary-500 shadow-primary-500/10' : 'border-surface-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                      {isCurrent && (
                        <span className="px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase border border-primary-500/30">
                          Plano Atual
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400">{plan.description}</p>

                    <div className="py-3 border-y border-surface-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-400 font-mono">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-xs text-zinc-400">/{billingCycle === 'YEARLY' ? 'ano' : 'mês'}</span>
                      </div>
                    </div>

                    <ul className="text-xs text-zinc-300 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-400" />
                        <span>Até {plan.maxStores} Lojas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-400" />
                        <span>Até {plan.maxUsers} Usuários</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-400" />
                        <span>Até {plan.maxProducts} Produtos Cadastrados</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={isCurrent || stripeCheckoutMutation.isPending}
                    onClick={() => stripeCheckoutMutation.mutate(plan.slug)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                      isCurrent
                        ? 'bg-zinc-800 text-zinc-500 cursor-default'
                        : 'bg-primary-500 hover:bg-primary-400 text-black shadow-primary-500/20'
                    }`}
                  >
                    {isCurrent ? 'Plano Ativo' : 'Assinar via Stripe Checkout'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA AUDITORIA */}
      {tab === 'audit' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Entidade</th>
                  <th className="p-4">IP / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingAudit ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Carregando logs de auditoria...
                    </td>
                  </tr>
                ) : (
                  auditLogs?.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-mono text-zinc-400">{formatDate(log.createdAt)}</td>
                      <td className="p-4 font-bold text-zinc-200">{log.user?.name || 'Sistema'}</td>
                      <td className="p-4 font-mono text-primary-400 font-bold">{log.action}</td>
                      <td className="p-4 text-zinc-300">{log.entity}</td>
                      <td className="p-4 font-mono text-zinc-500">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
