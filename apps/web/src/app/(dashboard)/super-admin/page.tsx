'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Building,
  ShieldCheck,
  Zap,
  Activity,
  Search,
  CheckCircle,
  Ban,
  Clock,
  Layers,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function SuperAdminPlatformPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'tenants' | 'plans' | 'logs'>('tenants');
  const [searchTerm, setSearchTerm] = useState('');

  // Listar Empresas Cadastradas (Super Admin)
  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/superadmin/tenants');
      return res.data;
    },
  });

  // Listar Planos SaaS
  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['superadmin-plans'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/plans');
      return res.data;
    },
  });

  // Listar Logs da Plataforma
  const { data: systemLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['superadmin-logs'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/superadmin/logs');
      return res.data;
    },
    enabled: tab === 'logs',
  });

  // Ativar / Bloquear Empresa
  const toggleTenantMutation = useMutation({
    mutationFn: async ({ tenantId, active, status }: { tenantId: string; active: boolean; status?: string }) => {
      await api.put(`/subscriptions/superadmin/tenants/${tenantId}/status`, { active, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
    },
  });

  const filteredTenants = (tenants || []).filter(
    (t: any) =>
      !searchTerm ||
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Badge de Super Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/40 text-primary-400 font-extrabold text-[10px] uppercase tracking-wider">
              Plataforma Super Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Empresas & Assinaturas SaaS</h1>
          <p className="text-sm text-zinc-400">Monitoramento da infraestrutura, gerenciamento de tenants, planos e logs do sistema</p>
        </div>
      </div>

      {/* Grid de KPIs da Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Empresas</span>
            <Building className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{tenants?.length || 0}</div>
          <p className="text-xs text-zinc-400 mt-1">Tenants ativos na plataforma</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assinaturas Ativas</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {tenants?.filter((t: any) => t.active && t.subscriptionStatus === 'ACTIVE').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Clientes pagantes</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Em Período de Testes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {tenants?.filter((t: any) => t.subscriptionStatus === 'TRIAL').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Trial de 14 dias</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bloqueadas / Inativas</span>
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {tenants?.filter((t: any) => !t.active).length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Empresas suspensas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-surface-border pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'tenants'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Empresas (Tenants)</span>
          </button>
          <button
            onClick={() => setTab('plans')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'plans'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Planos SaaS & Valores</span>
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'logs'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Logs de Infraestrutura</span>
          </button>
        </div>

        {tab === 'tenants' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar empresa, slug ou e-mail..."
              className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400 transition"
            />
          </div>
        )}
      </div>

      {/* ABA TENANTS (GESTAO DE EMPRESAS) */}
      {tab === 'tenants' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Empresa / Código</th>
                  <th className="p-4">Plano Contratado</th>
                  <th className="p-4 text-center">Lojas</th>
                  <th className="p-4 text-center">Usuários</th>
                  <th className="p-4 text-center">Produtos</th>
                  <th className="p-4">Criado em</th>
                  <th className="p-4 text-center">Status Assinatura</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingTenants ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      Carregando empresas...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      Nenhuma empresa encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{tenant.name}</p>
                        <p className="font-mono text-[11px] text-primary-400">{tenant.slug}</p>
                      </td>
                      <td className="p-4 font-bold text-zinc-200 uppercase">{tenant.plan || 'STARTER'}</td>
                      <td className="p-4 text-center font-mono text-zinc-300">{tenant.metrics?.storesCount || 1}</td>
                      <td className="p-4 text-center font-mono text-zinc-300">{tenant.metrics?.usersCount || 1}</td>
                      <td className="p-4 text-center font-mono text-zinc-300">{tenant.metrics?.productsCount || 0}</td>
                      <td className="p-4 font-mono text-zinc-400">{formatDate(tenant.createdAt)}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                            tenant.active && tenant.subscriptionStatus === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : tenant.subscriptionStatus === 'TRIAL'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {tenant.active ? tenant.subscriptionStatus || 'ATIVO' : 'BLOQUEADO'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {tenant.active ? (
                          <button
                            onClick={() =>
                              toggleTenantMutation.mutate({ tenantId: tenant.id, active: false, status: 'CANCELED' })
                            }
                            className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 transition"
                          >
                            Bloquear Empresa
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              toggleTenantMutation.mutate({ tenantId: tenant.id, active: true, status: 'ACTIVE' })
                            }
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20 transition"
                          >
                            Ativar Empresa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA PLANOS SAAS */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingPlans ? (
            <div className="col-span-3 text-center p-8 text-zinc-500">Carregando planos...</div>
          ) : (
            plans?.map((plan: any) => (
              <div key={plan.id} className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{plan.description}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-400 font-bold text-[10px] uppercase border border-primary-500/30">
                    {plan.slug}
                  </span>
                </div>

                <div className="py-2 border-y border-surface-border space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-400 font-mono">
                      {formatCurrency(plan.priceMonthly)}
                    </span>
                    <span className="text-xs text-zinc-400">/mês</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Ou {formatCurrency(plan.priceYearly)} no plano anual
                  </p>
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
            ))
          )}
        </div>
      )}

      {/* ABA LOGS DA PLATAFORMA */}
      {tab === 'logs' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Ação Registrada</th>
                  <th className="p-4">Módulo / Entidade</th>
                  <th className="p-4">IP de Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Carregando logs da infraestrutura...
                    </td>
                  </tr>
                ) : (
                  systemLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-mono text-zinc-400">{formatDate(log.createdAt)}</td>
                      <td className="p-4 font-bold text-zinc-200">{log.user?.name || 'Sistema / API'}</td>
                      <td className="p-4 font-mono font-bold text-primary-400">{log.action}</td>
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
