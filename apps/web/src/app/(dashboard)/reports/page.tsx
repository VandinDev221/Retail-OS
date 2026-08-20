'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  FileSpreadsheet,
  TrendingUp,
  Award,
  Layers,
  Printer,
  Calendar,
} from 'lucide-react';

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'abc'>('sales');

  const { data: salesReport, isLoading: loadingSales } = useQuery({
    queryKey: ['reports-sales'],
    queryFn: async () => {
      const res = await api.get('/reports/sales');
      return res.data;
    },
  });

  const { data: abcCurve, isLoading: loadingAbc } = useQuery({
    queryKey: ['reports-abc'],
    queryFn: async () => {
      const res = await api.get('/reports/abc-curve');
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Relatórios & Inteligência</h1>
          <p className="text-sm text-zinc-400">Análise de vendas, faturamento por operador, formas de pagamento e curva ABC</p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-200 border border-surface-border font-bold text-xs transition"
        >
          <Printer className="w-4 h-4 text-primary-400" />
          <span>Imprimir Relatório</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === 'sales'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Vendas & Formas de Pagamento</span>
        </button>
        <button
          onClick={() => setTab('abc')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === 'abc'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Curva ABC de Produtos</span>
        </button>
      </div>

      {/* ABA VENDAS */}
      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Faturado</span>
              <p className="text-2xl font-black text-white font-mono mt-1">
                {formatCurrency(salesReport?.grandTotal || 0)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">{salesReport?.salesCount || 0} vendas realizadas</p>
            </div>
            <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Ticket Médio</span>
              <p className="text-2xl font-black text-primary-400 font-mono mt-1">
                {formatCurrency(salesReport?.averageTicket || 0)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Valor médio por compra</p>
            </div>
            <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Operadores Ativos</span>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {Object.keys(salesReport?.operatorTotals || {}).length}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Colaboradores com vendas</p>
            </div>
          </div>

          {/* Formas de Pagamento Totais */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Faturamento por Meio de Pagamento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(salesReport?.paymentTotals || {}).map(([method, amount]: any) => (
                <div key={method} className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
                  <p className="text-[11px] text-zinc-400 uppercase font-semibold">{method}</p>
                  <p className="text-base font-bold text-zinc-100 font-mono mt-1">{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Vendas Recentes */}
          <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-surface-border bg-surface-card/60">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Últimas Transações de Venda</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                  <tr>
                    <th className="p-4">Código</th>
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Operador</th>
                    <th className="p-4 text-center">Itens</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {salesReport?.sales?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-mono font-bold text-primary-400">{s.code}</td>
                      <td className="p-4 font-mono text-zinc-400">{formatDate(s.createdAt)}</td>
                      <td className="p-4 text-zinc-300">{s.user.name}</td>
                      <td className="p-4 text-center text-zinc-300">{s.items?.length || 0}</td>
                      <td className="p-4 text-right font-mono font-bold text-zinc-100">{formatCurrency(s.total)}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA CURVA ABC */}
      {tab === 'abc' && (
        <div className="space-y-6">
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-1">Classificação ABC de Faturamento</h3>
            <p className="text-xs text-zinc-400 mb-4">
              <strong>Classe A (Até 70%):</strong> Produtos mais representativos no faturamento.{' '}
              <strong>Classe B (70% a 90%):</strong> Produtos intermediários.{' '}
              <strong>Classe C (90% a 100%):</strong> Produtos de menor giro/receita.
            </p>

            <div className="border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                  <tr>
                    <th className="p-4">Produto</th>
                    <th className="p-4 text-right">Qtd Vendida</th>
                    <th className="p-4 text-right">Receita Total</th>
                    <th className="p-4 text-right">% Participação</th>
                    <th className="p-4 text-right">% Acumulada</th>
                    <th className="p-4 text-center">Classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {loadingAbc ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        Calculando curva ABC...
                      </td>
                    </tr>
                  ) : abcCurve?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        Nenhuma venda registrada para cálculo da curva.
                      </td>
                    </tr>
                  ) : (
                    abcCurve?.items?.map((item: any) => (
                      <tr key={item.product.id} className="hover:bg-surface-card/50 transition">
                        <td className="p-4 font-bold text-zinc-100">{item.product.name}</td>
                        <td className="p-4 text-right font-mono text-zinc-300">{item.quantitySold} un</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-400">{item.percentage.toFixed(1)}%</td>
                        <td className="p-4 text-right font-mono text-zinc-400">
                          {item.accumulatedPercentage.toFixed(1)}%
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full font-black text-xs ${
                              item.classification === 'A'
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                                : item.classification === 'B'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            Classe {item.classification}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
