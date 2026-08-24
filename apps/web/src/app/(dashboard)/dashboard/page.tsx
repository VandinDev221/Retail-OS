'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  Boxes,
  Wallet,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data;
    },
    refetchInterval: 20000,
  });

  const { data: expiryAlerts } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: async () => {
      const res = await api.get('/inventory/expiry-alerts');
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel de Controle</h1>
          <p className="text-sm text-zinc-400">Visão operacional e financeira em tempo real</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-sm shadow-lg shadow-primary-500/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Abrir PDV (Frente de Caixa)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Hoje */}
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vendas Hoje</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {isLoading ? '...' : formatCurrency(dashboard?.today?.revenue || 0)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {dashboard?.today?.salesCount || 0} pedidos concluídos
          </p>
        </div>

        {/* Card 2: Ticket Médio */}
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {isLoading ? '...' : formatCurrency(dashboard?.today?.averageTicket || 0)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Média por cliente atendido</p>
        </div>

        {/* Card 3: Itens Vendidos */}
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Itens Vendidos</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {isLoading ? '...' : dashboard?.today?.itemsSold || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Unidades movimentadas hoje</p>
        </div>

        {/* Card 4: Alertas FEFO & Estoque Baixo */}
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Atenção Estoque</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {isLoading ? '...' : (dashboard?.stock?.expiringIn7DaysCount || 0) + (dashboard?.stock?.lowStockCount || 0)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {dashboard?.stock?.expiringIn7DaysCount || 0} lotes vencendo / {dashboard?.stock?.lowStockCount || 0} baixo estoque
          </p>
        </div>
      </div>

      {/* Grid: Alertas FEFO e Status do Caixa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas de Validade (FEFO) */}
        <div className="lg:col-span-2 bg-surface border border-surface-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-primary-400" />
              <h2 className="font-bold text-base text-white">Alertas de Validade (Algoritmo FEFO)</h2>
            </div>
            <Link href="/inventory" className="text-xs font-medium text-primary-400 hover:underline flex items-center gap-1">
              <span>Ver todos os lotes</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-xs text-red-400 font-semibold">Vencidos</p>
              <p className="text-xl font-bold text-red-300 mt-1">{expiryAlerts?.summary?.expiredCount || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
              <p className="text-xs text-orange-400 font-semibold">Vencem em 3 dias</p>
              <p className="text-xl font-bold text-orange-300 mt-1">{expiryAlerts?.summary?.expiringIn3DaysCount || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-xs text-amber-400 font-semibold">Vencem em 7 dias</p>
              <p className="text-xl font-bold text-amber-300 mt-1">{expiryAlerts?.summary?.expiringIn7DaysCount || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="text-xs text-blue-400 font-semibold">Vencem em 30 dias</p>
              <p className="text-xl font-bold text-blue-300 mt-1">{expiryAlerts?.summary?.expiringIn30DaysCount || 0}</p>
            </div>
          </div>

          {/* Lista de lotes mais críticos */}
          <div className="space-y-2">
            {expiryAlerts?.expiringIn7Days?.length === 0 && expiryAlerts?.expired?.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">Nenhum lote com vencimento crítico no momento.</p>
            ) : (
              [...(expiryAlerts?.expired || []), ...(expiryAlerts?.expiringIn7Days || [])].slice(0, 4).map((lot: any) => (
                <div
                  key={lot.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-card border border-surface-border text-xs"
                >
                  <div>
                    <p className="font-semibold text-zinc-200">{lot.product.name}</p>
                    <p className="text-zinc-400 text-[11px]">Lote: {lot.lotNumber} | Qtd: {Number(lot.quantity)} un</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full font-semibold text-[10px] bg-red-500/20 text-red-400">
                    Vence em: {new Date(lot.expirationDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status das Sessões de Caixa */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-primary-400" />
                <h2 className="font-bold text-base text-white">Status dos Caixas</h2>
              </div>
              <Link href="/cash" className="text-xs font-medium text-primary-400 hover:underline">
                Gerenciar
              </Link>
            </div>

            <div className="space-y-3">
              {dashboard?.cash?.openSessions?.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-surface-card border border-surface-border text-zinc-400 text-xs">
                  <p>Nenhum caixa aberto no momento.</p>
                  <Link
                    href="/cash"
                    className="inline-block mt-3 px-4 py-2 rounded-lg bg-primary-500 text-black font-bold text-xs"
                  >
                    Abrir Sessão de Caixa
                  </Link>
                </div>
              ) : (
                dashboard?.cash?.openSessions?.map((s: any) => (
                  <div key={s.id} className="p-3.5 rounded-xl bg-surface-card border border-surface-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 text-xs">{s.cashRegister.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                        Aberto
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">Operador: {s.openedBy.name}</p>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-border/60">
                      <span className="text-zinc-400">Fundo Inicial:</span>
                      <span className="font-semibold text-zinc-200">{formatCurrency(s.initialBalance)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-surface-border/60">
            <Link
              href="/reports"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-xs font-semibold text-zinc-300 transition"
            >
              <Boxes className="w-4 h-4 text-primary-400" />
              <span>Ver Relatórios Completos</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
