'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Boxes,
  Clock,
  History,
  ClipboardList,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balances' | 'lots' | 'movements' | 'counts'>('lots');

  // Modal Ajuste Manual
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustType, setAdjustType] = useState('ADJUSTMENT');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Queries
  const { data: lots, isLoading: loadingLots } = useQuery({
    queryKey: ['inventory-lots'],
    queryFn: async () => {
      const res = await api.get('/inventory/lots');
      return res.data;
    },
  });

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ['inventory-balances'],
    queryFn: async () => {
      const res = await api.get('/inventory/balances');
      return res.data;
    },
  });

  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: async () => {
      const res = await api.get('/inventory/movements');
      return res.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-simple'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data?.data || [];
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const storeId = balances?.[0]?.storeId;
      await api.post('/inventory/adjust', {
        storeId,
        productId: adjustProductId,
        type: adjustType,
        quantity: parseFloat(adjustQuantity),
        notes: adjustNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-lots'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      setShowAdjustModal(false);
      setAdjustProductId('');
      setAdjustQuantity('');
      setAdjustNotes('');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao ajustar estoque'),
  });

  // Badge de Validade
  const getExpirationBadge = (dateStr: string) => {
    const exp = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-bold text-[10px] uppercase">
          Vencido ({Math.abs(diffDays)}d atrás)
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-[10px] uppercase animate-pulse">
          Vence em {diffDays} dias
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase">
          Vence em {diffDays} dias
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
        {exp.toLocaleDateString('pt-BR')} ({diffDays} dias)
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Estoque & Controle FEFO</h1>
          <p className="text-sm text-zinc-400">
            Algoritmo First Expired First Out, lotes de validade e movimentações auditadas
          </p>
        </div>

        <button
          onClick={() => setShowAdjustModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-primary-400 border border-surface-border font-bold text-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajuste Manual Avulso</span>
        </button>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setActiveTab('lots')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'lots'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Lotes & Validade (FEFO)</span>
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'balances'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Posição de Saldos</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'movements'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Movimentações</span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA LOTES & FEFO */}
      {activeTab === 'lots' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Produto</th>
                  <th className="p-4">Lote</th>
                  <th className="p-4">Fornecedor</th>
                  <th className="p-4 text-right">Qtd em Estoque</th>
                  <th className="p-4 text-center">Data de Validade</th>
                  <th className="p-4 text-center">Status FEFO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingLots ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Carregando lotes...
                    </td>
                  </tr>
                ) : lots?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Nenhum lote registrado.
                    </td>
                  </tr>
                ) : (
                  lots?.map((lot: any) => (
                    <tr key={lot.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-bold text-zinc-100">{lot.product.name}</td>
                      <td className="p-4 font-mono text-zinc-300">{lot.lotNumber}</td>
                      <td className="p-4 text-zinc-400">{lot.supplier?.name || 'Distribuidor Matriz'}</td>
                      <td className="p-4 text-right font-mono font-bold text-zinc-100">
                        {Number(lot.quantity)} un
                      </td>
                      <td className="p-4 text-center font-mono text-zinc-300">
                        {new Date(lot.expirationDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-center">{getExpirationBadge(lot.expirationDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA SALDOS */}
      {activeTab === 'balances' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Produto</th>
                  <th className="p-4">Código EAN</th>
                  <th className="p-4">Localização</th>
                  <th className="p-4 text-right">Saldo Atual</th>
                  <th className="p-4 text-right">Valor em Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingBalances ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Carregando saldos...
                    </td>
                  </tr>
                ) : (
                  balances?.map((b: any) => (
                    <tr key={b.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-bold text-zinc-100">{b.product.name}</td>
                      <td className="p-4 font-mono text-zinc-400">{b.product.barcode || 'N/A'}</td>
                      <td className="p-4 text-zinc-300">{b.location.name}</td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        {Number(b.quantity)} {b.product.unit?.symbol || 'un'}
                      </td>
                      <td className="p-4 text-right font-mono text-zinc-300">
                        {formatCurrency(Number(b.quantity) * Number(b.product.salePrice))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA MOVIMENTAÇÕES */}
      {activeTab === 'movements' && (
        <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
                <tr>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Produto</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Quantidade</th>
                  <th className="p-4 text-right">Saldo Resultante</th>
                  <th className="p-4">Operador / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loadingMovements ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Carregando movimentações...
                    </td>
                  </tr>
                ) : (
                  movements?.data?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-surface-card/50 transition">
                      <td className="p-4 font-mono text-zinc-400">{formatDate(m.createdAt)}</td>
                      <td className="p-4 font-bold text-zinc-100">{m.product.name}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            m.type === 'PURCHASE' || m.type === 'INITIAL_BALANCE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : m.type === 'SALE'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-zinc-200">
                        {Number(m.quantity)} un
                      </td>
                      <td className="p-4 text-right font-mono text-zinc-400">{Number(m.balanceAfter)} un</td>
                      <td className="p-4 text-zinc-400">{m.notes || m.user?.name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE MANUAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-primary-400" />
              <span>Ajuste Manual de Estoque</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold">Produto</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-zinc-200"
                >
                  <option value="">Selecione um produto...</option>
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold">Tipo de Movimentação</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-zinc-200"
                >
                  <option value="ADJUSTMENT">Ajuste de Saldo</option>
                  <option value="LOSS">Perda / Avaria</option>
                  <option value="EXPIRED">Produto Vencido</option>
                  <option value="INITIAL_BALANCE">Saldo Inicial</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold">Quantidade</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-semibold">Motivo do Ajuste</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Ex: Quebra de garrafa na reposição"
                  className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending || !adjustProductId || !adjustQuantity}
                className="px-5 py-2 rounded-xl bg-primary-500 text-black font-bold text-xs hover:bg-primary-400 disabled:opacity-40"
              >
                {adjustMutation.isPending ? 'Salvando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
