'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Receipt,
  TrendingDown,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Plus,
  Clock,
} from 'lucide-react';

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'payables' | 'receivables'>('payables');

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const res = await api.get('/finance/summary');
      return res.data;
    },
  });

  const { data: payables, isLoading: loadingPayables } = useQuery({
    queryKey: ['finance-payables'],
    queryFn: async () => {
      const res = await api.get('/finance/payables');
      return res.data;
    },
  });

  const { data: receivables, isLoading: loadingReceivables } = useQuery({
    queryKey: ['finance-receivables'],
    queryFn: async () => {
      const res = await api.get('/finance/receivables');
      return res.data;
    },
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/finance/payables/${id}/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payables'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/finance/receivables/${id}/receive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Financeiro Operacional</h1>
        <p className="text-sm text-zinc-400">Controle de contas a pagar, contas a receber e fluxo de caixa</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">A Pagar Pendente</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {formatCurrency(summary?.payablesPending || 0)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Total de obrigações em aberto</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">A Receber Pendente</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(summary?.receivablesPending || 0)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Fiados e crediários a receber</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Receita de Vendas (Mês)</span>
            <DollarSign className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-2xl font-black text-primary-400 font-mono">
            {formatCurrency(summary?.salesRevenueThisMonth || 0)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Faturamento total acumulado</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setTab('payables')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === 'payables'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Contas a Pagar</span>
        </button>
        <button
          onClick={() => setTab('receivables')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === 'receivables'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Contas a Receber</span>
        </button>
      </div>

      {/* Tabela de Contas a Pagar */}
      {tab === 'payables' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Fornecedor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingPayables ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Carregando...
                    </td>
                  </tr>
                ) : payables?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Nenhuma conta a pagar registrada.
                    </td>
                  </tr>
                ) : (
                  payables?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-bold text-zinc-100">{item.description}</td>
                      <td className="p-4 text-zinc-300">{item.supplier?.name || '-'}</td>
                      <td className="p-4 font-mono text-zinc-400">
                        {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-red-400">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            item.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {item.status === 'PAID' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {item.status !== 'PAID' && (
                          <button
                            onClick={() => payMutation.mutate(item.id)}
                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-lg transition"
                          >
                            Baixar / Pagar
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

      {/* Tabela de Contas a Receber */}
      {tab === 'receivables' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingReceivables ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Carregando...
                    </td>
                  </tr>
                ) : receivables?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Nenhuma conta a receber registrada.
                    </td>
                  </tr>
                ) : (
                  receivables?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-bold text-zinc-100">{item.description}</td>
                      <td className="p-4 text-zinc-300">{item.customer?.name || '-'}</td>
                      <td className="p-4 font-mono text-zinc-400">
                        {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            item.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {item.status === 'PAID' ? 'Recebido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {item.status !== 'PAID' && (
                          <button
                            onClick={() => receiveMutation.mutate(item.id)}
                            className="px-3 py-1 bg-primary-500 text-black font-bold rounded-lg transition"
                          >
                            Receber
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
    </div>
  );
}
