'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Truck, Plus, PackageCheck, FileCode, UploadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ParsedXmlItem {
  code: string;
  name: string;
  barcode: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber?: string;
  expirationDate?: string;
  matchedProductId?: string;
}

interface ParsedXmlData {
  invoiceNumber: string;
  supplierName: string;
  supplierCnpj: string;
  dueDate?: string;
  items: ParsedXmlItem[];
}

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showXmlModal, setShowXmlModal] = useState(false);

  // Form states (Manual Entry)
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  // XML Import states
  const [xmlData, setXmlData] = useState<ParsedXmlData | null>(null);
  const [xmlSupplierId, setXmlSupplierId] = useState('');
  const [xmlDueDate, setXmlDueDate] = useState('');
  const [xmlItemMappings, setXmlItemMappings] = useState<Record<number, string>>({});

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

  // Manual Receive Mutation
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

  // XML Batch Receive Mutation
  const xmlReceiveMutation = useMutation({
    mutationFn: async () => {
      if (!xmlData) return;
      const storeId = products?.[0]?.stockBalances?.[0]?.storeId;
      
      const payloadItems = xmlData.items.map((item, index) => {
        const pId = xmlItemMappings[index] || item.matchedProductId;
        if (!pId) throw new Error(`Selecione o produto correspondente para "${item.name}"`);
        return {
          productId: pId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lotNumber: item.lotNumber || undefined,
          expirationDate: item.expirationDate || undefined,
        };
      });

      await api.post('/purchases/receive', {
        storeId,
        supplierId: xmlSupplierId || suppliers?.[0]?.id,
        invoiceNumber: xmlData.invoiceNumber,
        dueDate: xmlDueDate || xmlData.dueDate,
        items: payloadItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-lots'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      setShowXmlModal(false);
      setXmlData(null);
      setXmlItemMappings({});
      alert('Nota Fiscal importada e estoque atualizado com sucesso!');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao processar importação da Nota Fiscal'),
  });

  // Process XML File
  const handleXmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const xmlText = evt.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Extract Invoice Info
        const nNF = xmlDoc.getElementsByTagName('nNF')?.[0]?.textContent || 'S/N';
        const emitNome = xmlDoc.getElementsByTagName('xNome')?.[0]?.textContent || 'Fornecedor XML';
        const emitCnpj = xmlDoc.getElementsByTagName('CNPJ')?.[0]?.textContent || '';
        const dVenc = xmlDoc.getElementsByTagName('dVenc')?.[0]?.textContent || '';

        // Match Supplier
        const matchedSupplier = suppliers?.find(
          (s: any) => (s.document && emitCnpj && s.document.replace(/\D/g, '') === emitCnpj.replace(/\D/g, '')) ||
                      s.name.toLowerCase().includes(emitNome.toLowerCase())
        );
        if (matchedSupplier) {
          setXmlSupplierId(matchedSupplier.id);
        } else if (suppliers?.length > 0) {
          setXmlSupplierId(suppliers[0].id);
        }

        if (dVenc) setXmlDueDate(dVenc);

        // Extract Items (det tags)
        const detList = Array.from(xmlDoc.getElementsByTagName('det'));
        const initialMappings: Record<number, string> = {};

        const parsedItems: ParsedXmlItem[] = detList.map((det, idx) => {
          const cProd = det.getElementsByTagName('cProd')?.[0]?.textContent || '';
          const xProd = det.getElementsByTagName('xProd')?.[0]?.textContent || `Item ${idx + 1}`;
          const cEAN = det.getElementsByTagName('cEAN')?.[0]?.textContent || '';
          const qCom = parseFloat(det.getElementsByTagName('qCom')?.[0]?.textContent || '1');
          const vUnCom = parseFloat(det.getElementsByTagName('vUnCom')?.[0]?.textContent || '0');
          const vProd = parseFloat(det.getElementsByTagName('vProd')?.[0]?.textContent || '0');

          const nLote = det.getElementsByTagName('nLote')?.[0]?.textContent || '';
          const dVal = det.getElementsByTagName('dVal')?.[0]?.textContent || '';

          // Auto Match Product by Barcode or Name
          const matchedProd = products?.find((p: any) => {
            if (cEAN && cEAN !== 'SEM GTIN' && p.barcode === cEAN) return true;
            if (p.name.toLowerCase() === xProd.toLowerCase()) return true;
            return false;
          });

          if (matchedProd) {
            initialMappings[idx] = matchedProd.id;
          }

          return {
            code: cProd,
            name: xProd,
            barcode: cEAN,
            quantity: qCom,
            unitCost: vUnCom,
            totalCost: vProd,
            lotNumber: nLote || undefined,
            expirationDate: dVal || undefined,
            matchedProductId: matchedProd?.id,
          };
        });

        setXmlData({
          invoiceNumber: nNF,
          supplierName: emitNome,
          supplierCnpj: emitCnpj,
          dueDate: dVenc,
          items: parsedItems,
        });

        setXmlItemMappings(initialMappings);
        setShowXmlModal(true);
      } catch (err) {
        alert('Falha ao ler o arquivo XML da Nota Fiscal. Verifique se o arquivo está no formato NF-e válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xml"
        onChange={handleXmlFileUpload}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compras & Recebimento de Estoque</h1>
          <p className="text-sm text-zinc-400">Importação automatizada via XML de Nota Fiscal (NF-e) ou entrada manual</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
          >
            <FileCode className="w-4 h-4" />
            <span>Importar XML da Nota Fiscal</span>
          </button>

          <button
            onClick={() => setShowReceiveModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-zinc-100 border border-surface-border text-sm font-semibold transition"
          >
            <PackageCheck className="w-4 h-4 text-primary-400" />
            <span>Entrada Manual</span>
          </button>
        </div>
      </div>

      {/* Tabela de Pedidos e Entradas */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-surface-border bg-surface-card/40 flex justify-between items-center">
          <h2 className="text-sm font-bold text-zinc-200">Histórico de Entradas & Pedidos de Compra</h2>
          <span className="text-xs text-zinc-400">{orders?.length || 0} registros encontrados</span>
        </div>

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
                    Carregando histórico de compras...
                  </td>
                </tr>
              ) : orders?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Nenhum pedido de compra ou entrada por XML registrado.
                  </td>
                </tr>
              ) : (
                orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-surface-card/50 transition">
                    <td className="p-4 font-mono text-zinc-400">{formatDate(ord.createdAt)}</td>
                    <td className="p-4 font-bold text-zinc-100">{ord.supplier?.name || 'Fornecedor Diversos'}</td>
                    <td className="p-4 text-zinc-300">{ord.items?.length || 0} produtos</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(ord.totalAmount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase">
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400">{ord.createdBy?.name || 'Sistema'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL IMPORTAR XML NOTA FISCAL (NF-e) */}
      {showXmlModal && xmlData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <span>Importação da Nota Fiscal - NF-e Nº {xmlData.invoiceNumber}</span>
              </h3>
              <button
                onClick={() => {
                  setShowXmlModal(false);
                  setXmlData(null);
                }}
                className="text-zinc-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Cabeçalho da Nota */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-surface-card rounded-xl border border-surface-border text-xs">
              <div>
                <span className="text-zinc-400 font-semibold block">Fornecedor na Nota:</span>
                <p className="font-bold text-zinc-100 truncate mt-0.5">{xmlData.supplierName}</p>
                {xmlData.supplierCnpj && <span className="text-[10px] text-zinc-500 font-mono">CNPJ: {xmlData.supplierCnpj}</span>}
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Fornecedor no Sistema:</label>
                <select
                  value={xmlSupplierId}
                  onChange={(e) => setXmlSupplierId(e.target.value)}
                  className="w-full bg-background border border-surface-border rounded-lg px-2.5 py-1.5 text-zinc-100"
                >
                  {suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Vencimento Contas a Pagar:</label>
                <input
                  type="date"
                  value={xmlDueDate}
                  onChange={(e) => setXmlDueDate(e.target.value)}
                  className="w-full bg-background border border-surface-border rounded-lg px-2.5 py-1.5 text-zinc-100"
                />
              </div>
            </div>

            {/* Tabela de Itens extraídos do XML */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-zinc-200">Itens Reconhecidos ({xmlData.items.length})</h4>
                <span className="text-[11px] text-zinc-400">Vincule os produtos do XML aos cadastrados no estoque</span>
              </div>

              <div className="border border-surface-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold">
                    <tr>
                      <th className="p-3">Item na Nota Fiscal</th>
                      <th className="p-3">Produto no Estoque (Vínculo)</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3 text-right">Custo Unit.</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3">Lote / Validade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {xmlData.items.map((item, idx) => {
                      const selectedProductId = xmlItemMappings[idx] || '';

                      return (
                        <tr key={idx} className="hover:bg-surface-card/40 transition">
                          <td className="p-3">
                            <p className="font-semibold text-zinc-100">{item.name}</p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Cód: {item.code} {item.barcode && `| EAN: ${item.barcode}`}
                            </span>
                          </td>

                          <td className="p-3">
                            <select
                              value={selectedProductId}
                              onChange={(e) =>
                                setXmlItemMappings((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                              className={`w-full bg-background border rounded-lg px-2 py-1 text-xs ${
                                selectedProductId ? 'border-emerald-500/40 text-emerald-400 font-semibold' : 'border-amber-500/50 text-amber-300'
                              }`}
                            >
                              <option value="">Selecione o produto...</option>
                              {products?.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.barcode ? `(${p.barcode})` : ''}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-3 text-center font-mono font-bold text-zinc-100">{item.quantity}</td>
                          <td className="p-3 text-right font-mono text-zinc-300">{formatCurrency(item.unitCost)}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            {formatCurrency(item.totalCost)}
                          </td>
                          <td className="p-3 text-zinc-400 font-mono text-[10px]">
                            {item.lotNumber && <div>Lote: {item.lotNumber}</div>}
                            {item.expirationDate && <div>Val: {item.expirationDate}</div>}
                            {!item.lotNumber && !item.expirationDate && <span>-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-border">
              <div className="text-xs">
                <span className="text-zinc-400">Total da Nota Fiscal: </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(xmlData.items.reduce((acc, i) => acc + i.totalCost, 0))}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowXmlModal(false);
                    setXmlData(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-card text-xs text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => xmlReceiveMutation.mutate()}
                  disabled={xmlReceiveMutation.isPending || Object.keys(xmlItemMappings).length === 0}
                  className="px-6 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 disabled:opacity-40 shadow-lg shadow-emerald-500/20"
                >
                  {xmlReceiveMutation.isPending ? 'Dando Entrada no Estoque...' : 'Confirmar Entrada por XML'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECEBER MERCADORIA MANUAL */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-primary-400" />
              <span>Entrada Manual de Mercadoria</span>
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
