'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Building,
  Users,
  Zap,
  Activity,
  Search,
  CheckCircle,
  Ban,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  UserPlus,
} from 'lucide-react';

export default function SuperAdminPlatformPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'tenants' | 'users' | 'plans' | 'logs'>('tenants');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais de Empresa
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [tenantForm, setTenantForm] = useState({
    name: '',
    slug: '',
    cnpj: '',
    email: '',
    phone: '',
    plan: 'PRO',
  });

  // Modais de Usuário
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    tenantId: '',
    name: '',
    email: '',
    password: '',
    role: 'CAIXA',
    active: true,
  });

  // Listar Empresas Cadastradas (Super Admin)
  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/superadmin/tenants');
      return res.data;
    },
  });

  // Listar Todos os Usuários da Plataforma (Super Admin)
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/superadmin/users');
      return res.data;
    },
    enabled: tab === 'users' || showUserModal,
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

  // Mutations Empresas
  const saveTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTenant) {
        return api.put(`/subscriptions/superadmin/tenants/${editingTenant.id}`, data);
      }
      return api.post('/subscriptions/superadmin/tenants', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      setShowTenantModal(false);
      setEditingTenant(null);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/subscriptions/superadmin/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
    },
  });

  const toggleTenantMutation = useMutation({
    mutationFn: async ({ tenantId, active, status }: { tenantId: string; active: boolean; status?: string }) => {
      await api.put(`/subscriptions/superadmin/tenants/${tenantId}/status`, { active, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
    },
  });

  // Mutations Usuários
  const saveUserMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingUser) {
        return api.put(`/subscriptions/superadmin/users/${editingUser.id}`, data);
      }
      return api.post('/subscriptions/superadmin/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
      setShowUserModal(false);
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/subscriptions/superadmin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
  });

  const filteredTenants = (tenants || []).filter(
    (t: any) =>
      !searchTerm ||
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredUsers = (users || []).filter(
    (u: any) =>
      !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenNewTenant = () => {
    setEditingTenant(null);
    setTenantForm({ name: '', slug: '', cnpj: '', email: '', phone: '', plan: 'PRO' });
    setShowTenantModal(true);
  };

  const handleOpenEditTenant = (t: any) => {
    setEditingTenant(t);
    setTenantForm({
      name: t.name || '',
      slug: t.slug || '',
      cnpj: t.cnpj || '',
      email: t.email || '',
      phone: t.phone || '',
      plan: t.plan || 'PRO',
    });
    setShowTenantModal(true);
  };

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({
      tenantId: tenants?.[0]?.id || '',
      name: '',
      email: '',
      password: '',
      role: 'CAIXA',
      active: true,
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({
      tenantId: u.tenantId || u.tenant?.id || '',
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'CAIXA',
      active: u.active ?? true,
    });
    setShowUserModal(true);
  };

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Empresas & Usuários SaaS</h1>
          <p className="text-sm text-zinc-400">Controle total de tenants, usuários da plataforma, planos e auditoria</p>
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
          <p className="text-xs text-zinc-400 mt-1">Tenants na plataforma</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Usuários Totais</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{users?.length || 0}</div>
          <p className="text-xs text-zinc-400 mt-1">Cadastrados nas lojas</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assinaturas Ativas</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {tenants?.filter((t: any) => t.active && t.subscriptionStatus === 'ACTIVE').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Clientes com acesso liberado</p>
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
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              tab === 'tenants'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Empresas (Tenants)</span>
          </button>

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
            onClick={() => setTab('plans')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              tab === 'plans'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Planos SaaS</span>
          </button>

          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              tab === 'logs'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Logs de Infraestrutura</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {(tab === 'tenants' || tab === 'users') && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail..."
                className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400 transition"
              />
            </div>
          )}

          {tab === 'tenants' && (
            <button
              onClick={handleOpenNewTenant}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-500 hover:bg-primary-400 text-black font-bold rounded-xl text-xs transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa</span>
            </button>
          )}

          {tab === 'users' && (
            <button
              onClick={handleOpenNewUser}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-500 hover:bg-primary-400 text-black font-bold rounded-xl text-xs transition shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          )}
        </div>
      </div>

      {/* ABA TENANTS (GESTAO DE EMPRESAS) */}
      {tab === 'tenants' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Empresa / Código</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4 text-center">Lojas</th>
                  <th className="p-4 text-center">Usuários</th>
                  <th className="p-4">Criado em</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações CRUD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingTenants ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      Carregando empresas...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
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
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditTenant(tenant)}
                            className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-border text-zinc-300 border border-surface-border transition"
                            title="Editar Dados da Empresa"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-primary-400" />
                          </button>

                          {tenant.active ? (
                            <button
                              onClick={() =>
                                toggleTenantMutation.mutate({ tenantId: tenant.id, active: false, status: 'CANCELED' })
                              }
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 transition text-[10px]"
                            >
                              Bloquear
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                toggleTenantMutation.mutate({ tenantId: tenant.id, active: true, status: 'ACTIVE' })
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20 transition text-[10px]"
                            >
                              Ativar
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir permanentemente a empresa ${tenant.name}?`)) {
                                deleteTenantMutation.mutate(tenant.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                            title="Excluir Empresa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA USUARIOS DA PLATAFORMA (CRUD) */}
      {tab === 'users' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Nome do Usuário</th>
                  <th className="p-4">E-mail de Acesso</th>
                  <th className="p-4">Empresa (Tenant)</th>
                  <th className="p-4">Perfil (Role)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações CRUD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Carregando usuários da plataforma...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-bold text-white">{u.name}</td>
                      <td className="p-4 font-mono text-zinc-300">{u.email}</td>
                      <td className="p-4 font-bold text-primary-400">{u.tenant?.name || 'N/A'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 font-bold text-[10px] uppercase border border-primary-500/30">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-border text-zinc-300 border border-surface-border transition"
                            title="Editar Usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-primary-400" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir o usuário ${u.name}?`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* MODAL CRUD EMPRESA */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-border">
              <h3 className="font-bold text-lg text-white">
                {editingTenant ? 'Editar Empresa (Tenant)' : 'Cadastrar Nova Empresa'}
              </h3>
              <button onClick={() => setShowTenantModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTenantMutation.mutate(tenantForm);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Razão Social / Nome da Empresa</label>
                <input
                  type="text"
                  required
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">CNPJ</label>
                <input
                  type="text"
                  value={tenantForm.cnpj}
                  onChange={(e) => setTenantForm({ ...tenantForm, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">E-mail de Contato</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Plano SaaS</label>
                <select
                  value={tenantForm.plan}
                  onChange={(e) => setTenantForm({ ...tenantForm, plan: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none font-bold"
                >
                  <option value="STARTER">STARTER (R$ 99/mês)</option>
                  <option value="PRO">PRO (R$ 199/mês)</option>
                  <option value="ENTERPRISE">ENTERPRISE (R$ 499/mês)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTenantModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveTenantMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold"
                >
                  {saveTenantMutation.isPending ? 'Salvando...' : 'Salvar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRUD USUÁRIO */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-border">
              <h3 className="font-bold text-lg text-white">
                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveUserMutation.mutate(userForm);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Empresa Pertencente (Tenant)</label>
                <select
                  required
                  value={userForm.tenantId}
                  onChange={(e) => setUserForm({ ...userForm, tenantId: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none font-bold"
                >
                  {tenants?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">E-mail de Login</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">
                  {editingUser ? 'Senha (deixe em branco se não quiser alterar)' : 'Senha de Acesso'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Perfil (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2 text-zinc-100 focus:border-primary-400 outline-none font-bold"
                >
                  <option value="CAIXA">CAIXA (Operador de Frente de Loja)</option>
                  <option value="GERENTE">GERENTE (Gestão de Loja)</option>
                  <option value="ADMIN">ADMIN (Administrador da Empresa)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Administrador da Plataforma)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveUserMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold"
                >
                  {saveUserMutation.isPending ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
