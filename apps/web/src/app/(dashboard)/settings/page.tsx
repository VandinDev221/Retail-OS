'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../context/auth-context';
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
  AlertCircle,
  X,
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
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

  const [tenantForm, setTenantForm] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
  });

  React.useEffect(() => {
    if (tenant) {
      setTenantForm({
        name: tenant.name || '',
        cnpj: tenant.cnpj || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
      });
    }
  }, [tenant]);

  const updateTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.patch('/tenants/current', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-info'] });
      alert('Dados da empresa atualizados com sucesso!');
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
    enabled: tab === 'audit' && isSuperAdmin,
  });

  const [portalError, setPortalError] = useState<string | null>(null);

  // Mutation para Checkout na Stripe
  const stripeCheckoutMutation = useMutation({
    mutationFn: async (planSlug: string) => {
      setPortalError(null);
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
    onError: (err: any) => {
      setPortalError(
        err?.response?.data?.message ||
          'Não foi possível iniciar o checkout da Stripe. Verifique as chaves de API da Stripe.'
      );
    },
  });

  // Mutation para abrir Portal do Cliente na Stripe
  const stripePortalMutation = useMutation({
    mutationFn: async () => {
      setPortalError(null);
      const res = await api.post('/subscriptions/stripe/portal-session');
      return res.data;
    },
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    },
    onError: (err: any) => {
      setPortalError(
        err?.response?.data?.message ||
          'Para liberar o Portal de Faturas, ative a opção "Customer Portal" no seu painel da Stripe (Stripe Dashboard -> Settings -> Customer Portal).'
      );
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações & Administração</h1>
        <p className="text-sm text-zinc-400">Usuários, permissões RBAC e plano de assinatura Stripe</p>
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
        {isSuperAdmin && (
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
        )}
      </div>

      {portalError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold text-amber-200 block">Aviso do Portal Stripe</strong>
              <p className="leading-relaxed">{portalError}</p>
            </div>
          </div>
          <button
            onClick={() => setPortalError(null)}
            className="p-1 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* ABA DADOS CADASTRAIS DA EMPRESA */}
      {tab === 'tenant' && (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-surface-border">
            <div>
              <h2 className="text-lg font-bold text-white">Dados Cadastrais da Empresa</h2>
              <p className="text-xs text-zinc-400">Edite as informações cadastrais da sua empresa (Disponível para Gerentes e Administradores)</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-[10px] uppercase border border-emerald-500/20">
              {tenant?.plan || 'PLANO PRO'}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateTenantMutation.mutate(tenantForm);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Razão Social / Nome da Empresa</label>
                <input
                  type="text"
                  required
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary-400 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Slug do Tenant <span className="text-[10px] text-zinc-500 font-normal">(Gerado automaticamente - Não editável)</span>
                </label>
                <div className="w-full bg-surface-card/50 border border-surface-border/50 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none flex items-center justify-between">
                  <span>{tenant?.slug || 'loja-matriz'}</span>
                  <span className="text-[10px] uppercase font-sans text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">Automático</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={tenantForm.cnpj}
                  onChange={(e) => setTenantForm({ ...tenantForm, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail de Contato da Empresa</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Plano Atual Contratado</label>
                <div className="w-full bg-surface-card/50 border border-surface-border/50 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold flex items-center justify-between">
                  <span>{tenant?.plan || 'PRO'}</span>
                  <span className="text-[10px] text-zinc-400 font-normal">SaaS Ativo</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-border">
              <button
                type="submit"
                disabled={updateTenantMutation.isPending}
                className="px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-black font-extrabold rounded-xl text-xs transition shadow-lg flex items-center gap-2"
              >
                {updateTenantMutation.isPending ? 'Salvando Alterações...' : 'Salvar Dados da Empresa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA ASSINATURAS STRIPE */}
      {tab === 'subscription' && (
        <div className="space-y-6">
          {/* Card de Assinatura Atual */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-100 font-bold text-xs border border-surface-border transition shadow-md"
              >
                <CreditCard className="w-4 h-4 text-primary-400" />
                <span>Gerenciar Cartão e Faturas no Stripe</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Informações da Assinatura do Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-surface-card rounded-xl border border-surface-border">
                <span className="text-zinc-400 font-semibold block mb-1">Plano Contratado</span>
                <span className="text-sm font-bold text-primary-400">{subscription?.plan?.name || 'Plano Pro'}</span>
              </div>
              <div className="p-4 bg-surface-card rounded-xl border border-surface-border">
                <span className="text-zinc-400 font-semibold block mb-1">Ciclo de Cobrança</span>
                <span className="text-sm font-bold text-zinc-100">
                  {subscription?.billingCycle === 'YEARLY' ? 'Anual (-20%)' : 'Mensal'}
                </span>
              </div>
              <div className="p-4 bg-surface-card rounded-xl border border-surface-border">
                <span className="text-zinc-400 font-semibold block mb-1">Status no Stripe</span>
                <span className="text-sm font-bold text-emerald-400">Ativo / Regular</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA AUDITORIA */}
      {tab === 'audit' && isSuperAdmin && (
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
