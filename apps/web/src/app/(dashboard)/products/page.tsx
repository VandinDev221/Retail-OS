'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [trackLots, setTrackLots] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  // Queries
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-list', searchTerm, selectedCategory],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: {
          search: searchTerm || undefined,
          categoryId: selectedCategory || undefined,
        },
      });
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get('/products/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/products', {
        name,
        barcode: barcode || undefined,
        sku: sku || undefined,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        minStock: parseFloat(minStock) || 0,
        trackLots,
        categoryId: categoryId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      setShowCreateModal(false);
      setName('');
      setBarcode('');
      setSku('');
      setCostPrice('');
      setSalePrice('');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao cadastrar produto'),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Catálogo de Produtos</h1>
          <p className="text-sm text-zinc-400">Gerenciamento de SKUs, preços, códigos de barras e lotes</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-sm shadow-lg shadow-primary-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Produto</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, código de barras (EAN) ou SKU..."
            className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-primary-400"
          >
            <option value="">Todas as Categorias</option>
            {categories?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">Código / EAN</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Custo</th>
                <th className="p-4 text-right">Venda</th>
                <th className="p-4 text-center">Lotes / FEFO</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Carregando catálogo...
                  </td>
                </tr>
              ) : productsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                productsData?.data?.map((product: any) => (
                  <tr key={product.id} className="hover:bg-surface-card/50 transition">
                    <td className="p-4">
                      <p className="font-bold text-zinc-100 text-sm">{product.name}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">SKU: {product.sku || 'N/A'}</p>
                    </td>
                    <td className="p-4 font-mono text-zinc-300">
                      <span className="flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{product.barcode || 'Sem código'}</span>
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300">{product.category?.name || 'Geral'}</td>
                    <td className="p-4 text-right font-mono text-zinc-400">{formatCurrency(product.costPrice)}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(product.salePrice)}
                    </td>
                    <td className="p-4 text-center">
                      {product.trackLots ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 font-bold text-[10px] uppercase">
                          FEFO Ativo
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">Padrão</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CADASTRAR PRODUTO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-400" />
              <span>Novo Produto</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Coca-Cola Lata 350ml"
                  className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 text-zinc-100 text-sm focus:outline-none focus:border-primary-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="789..."
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold">SKU / Código Interno</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="BEB-001"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="2.50"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="5.00"
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-primary-400"
                  >
                    <option value="">Selecione...</option>
                    {categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3.5 py-2 font-mono text-zinc-100 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-200">Controlar Lotes & Validade (FEFO)</p>
                  <p className="text-[10px] text-zinc-400">Recomendado para perecíveis, alimentos e bebidas</p>
                </div>
                <input
                  type="checkbox"
                  checked={trackLots}
                  onChange={(e) => setTrackLots(e.target.checked)}
                  className="w-4 h-4 accent-primary-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary-500 text-black font-bold text-xs hover:bg-primary-400"
              >
                {createMutation.isPending ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
