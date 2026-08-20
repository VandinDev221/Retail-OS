'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Truck, Plus, PackageCheck, FileText } from 'lucide-react';

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = await api.get('/suppliers');
      return res.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-list-purchases'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data?.data || [];
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await api.get('/purchases/orders');
      return res.data;
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const storeId = products?.[0]?.stockBalances?.[0]?.storeId;
      await api.post('/purchases/receive', {
        storeId,
        supplierId,
        invoiceNumber,
        items: [
          {
            productId,
            quantity: parseFloat(quantity),
            unitCost: parseFloat(unitCost),
            lotNumber: lotNumber || undefined,
            expirationDate: expirationDate || undefined,
          },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-lots'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      setShowReceiveModal(false);
      setQuantity('');
      setUnitCost('');
      setLotNumber('');
      setInvoiceNumber('');
      alert('Entrada de mercadoria e lote registradas com sucesso!');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao registrar entrada'),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compras & Recebimento</h1>
          <p className="text-sm text-zinc-400">Entrada de mercadorias com geração automática de lotes e contas a pagar</p>
        </div>

        <button
          onClick={() => setShowReceiveModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-sm shadow-lg shadow-primary-500/20 transition"
        >
          <PackageCheck className="w-4 h-4" />
          <span>Receber Mercadoria (Entrada NF)</span>
        </button>
      </div>

      {/* Tabela de Pedidos e Entradas */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Fornecedor</th>
                <th className="p-4">Itens</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Criado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Carregando compras...
                  </td>
                </tr>
              ) : orders?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Nenhum pedido de compra ou entrada registrado.
                  </td>
                </tr>
              ) : (
                orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-surface-card/50 transition">
                    <td className="p-4 font-mono text-zinc-400">{formatDate(ord.createdAt)}</td>
                    <td className="p-4 font-bold text-zinc-100">{ord.supplier.name}</td>
                    <td className="p-4 text-zinc-300">{ord.items?.length || 0} produtos</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(ord.totalAmount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase">
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400">{ord.createdBy.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RECEBER MERCADORIA */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-primary-400" />
              <span>Entrada de Mercadoria / Nota Fiscal</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold">Fornecedor</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-zinc-200"
                  >
                    <option value="">Selecione...</option>
                    {suppliers?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold">Número da Nota Fiscal</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: NF-12345"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold">Produto</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-zinc-200"
                >
                  <option value="">Selecione o produto...</option>
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold">Quantidade Recebida</label>
                  <input
                    type="number"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="Ex: 3.50"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-surface-card rounded-xl border border-surface-border">
                <div>
                  <label className="text-zinc-400 font-semibold">Identificador do Lote</label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ex: L-2026-A"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-1.5 font-mono text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold">Data de Validade (FEFO)</label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-1.5 text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => receiveMutation.mutate()}
                disabled={receiveMutation.isPending || !productId || !quantity || !unitCost}
                className="px-5 py-2 rounded-xl bg-primary-500 text-black font-bold text-xs hover:bg-primary-400 disabled:opacity-40"
              >
                {receiveMutation.isPending ? 'Gravando...' : 'Confirmar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
