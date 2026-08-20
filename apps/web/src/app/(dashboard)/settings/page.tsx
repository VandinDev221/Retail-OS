'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import {
  Settings,
  Users,
  Shield,
  History,
  Store,
  Key,
} from 'lucide-react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'users' | 'tenant' | 'audit'>('users');

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

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit');
      return res.data;
    },
    enabled: tab === 'audit',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações & Administração</h1>
        <p className="text-sm text-zinc-400">Usuários, permissões RBAC, dados da empresa e auditoria</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === 'tenant'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Dados da Loja / Empresa</span>
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
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
              <p className="text-sm font-bold text-emerald-400 mt-1">{tenant?.plan}</p>
            </div>
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
                ) : auditLogs?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Nenhum registro de auditoria.
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
