'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  Printer,
  Sparkles,
} from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  trackLots: boolean;
}

export default function PosPage() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('Consumidor Final');

  // Modais
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSaleResult, setLastSaleResult] = useState<any>(null);

  // Pagamentos no modal
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState('CASH');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Buscar Sessão de Caixa Aberta
  const { data: activeSession, refetch: refetchSession } = useQuery({
    queryKey: ['pos-active-session'],
    queryFn: async () => {
      const res = await api.get('/cash/active-session');
      return res.data;
    },
  });

  // Clientes
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    },
  });

  // Manter foco no campo de código de barras
  useEffect(() => {
    if (!showPaymentModal && !showDiscountModal && !showCustomerModal && !showSuccessModal) {
      barcodeInputRef.current?.focus();
    }
  }, [showPaymentModal, showDiscountModal, showCustomerModal, showSuccessModal, cart]);

  // Cálculos do Carrinho
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const totalSale = Math.max(0, subtotal - discountTotal);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingToPay = Math.max(0, totalSale - totalPaid);
  const changeAmount = totalPaid > totalSale ? totalPaid - totalSale : 0;

  // Som de Bip
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 100);
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Buscar e adicionar produto por código de barras
  const handleAddProduct = async (code: string) => {
    if (!code.trim()) return;

    let qty = 1;
    let searchCode = code.trim();

    // Suporte a quantidade multiplicada: Ex: 3*7894900011517
    if (searchCode.includes('*')) {
      const [qtyStr, codeStr] = searchCode.split('*');
      qty = parseFloat(qtyStr) || 1;
      searchCode = codeStr.trim();
    }

    try {
      const res = await api.get(`/products/barcode/${searchCode}`);
      const prod = res.data;

      playBeep();
      setFeedbackMsg({ type: 'success', text: `Adicionado: ${prod.name}` });

      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.productId === prod.id);
        const unitPrice = Number(prod.salePrice);

        if (existingIndex >= 0) {
          const updated = [...prev];
          const newQty = updated[existingIndex].quantity + qty;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            total: newQty * unitPrice - updated[existingIndex].discount,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              productId: prod.id,
              name: prod.name,
              barcode: prod.barcode || '',
              sku: prod.sku || '',
              unitPrice,
              quantity: qty,
              discount: 0,
              total: qty * unitPrice,
              trackLots: prod.trackLots,
            },
          ];
        }
      });
      setBarcodeInput('');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.response?.data?.message || 'Produto não encontrado' });
    }
  };

  // Atalhos de Teclado (F2, F4, F6, F8, F10, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
        setShowDiscountModal(false);
        setShowCustomerModal(false);
        setShowSuccessModal(false);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPaymentModal(true);
          setPaymentAmountInput(remainingToPay.toFixed(2));
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowDiscountModal(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (confirm('Deseja limpar todo o carrinho?')) {
          setCart([]);
          setDiscountTotal(0);
          setPayments([]);
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (showPaymentModal && totalPaid >= totalSale) {
          handleFinalizeSale();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, totalPaid, totalSale, remainingToPay]);

  // Adicionar Pagamento
  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmountInput);
    if (!amount || amount <= 0) return;

    setPayments((prev) => [...prev, { method: currentPaymentMethod, amount }]);
    setPaymentAmountInput('');
  };

  // Finalizar Venda Atômica
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    if (totalPaid < totalSale) {
      alert('O valor total pago é menor que o valor da venda!');
      return;
    }

    setIsFinalizing(true);
    try {
      const idempotencyKey = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        storeId: activeSession?.storeId || undefined,
        cashSessionId: activeSession?.id || undefined,
        customerId: selectedCustomerId || undefined,
        discount: discountTotal,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        payments: payments.length > 0 ? payments : [{ method: 'CASH', amount: totalSale }],
        idempotencyKey,
      };

      const res = await api.post('/sales/checkout', payload, {
        headers: { 'idempotency-key': idempotencyKey },
      });

      setLastSaleResult(res.data);
      setShowPaymentModal(false);
      setShowSuccessModal(true);

      // Limpar estado
      setCart([]);
      setPayments([]);
      setDiscountTotal(0);
      setSelectedCustomerId(null);
      setSelectedCustomerName('Consumidor Final');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao processar venda no PDV');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* Alerta de Caixa Fechado */}
      {!activeSession && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Nenhuma sessão de caixa está aberta para este operador. Abra o caixa para registrar vendas em dinheiro.</span>
          </div>
          <a href="/cash" className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400">
            Abrir Caixa Agora
          </a>
        </div>
      )}

      {/* Main PDV Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Coluna Esquerda: Leitor de Código de Barras & Carrinho (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
          {/* Input Barcode Scanner */}
          <div className="p-4 border-b border-surface-border bg-surface-card/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddProduct(barcodeInput);
              }}
              className="relative"
            >
              <Search className="w-5 h-5 text-primary-400 absolute left-4 top-3.5" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanear Código de Barras ou digitar (Ex: 789... ou 2*789...)"
                className="w-full bg-background border-2 border-primary-500/40 rounded-xl pl-12 pr-28 py-3 text-base font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400 shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-4 py-1.5 bg-primary-500 hover:bg-primary-400 text-black font-bold rounded-lg text-xs transition"
              >
                Enter
              </button>
            </form>

            {feedbackMsg && (
              <p
                className={`text-xs mt-2 font-medium ${
                  feedbackMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {feedbackMsg.text}
              </p>
            )}
          </div>

          {/* Lista de Itens do Carrinho */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-zinc-600" />
                <p className="font-semibold text-zinc-400">Caixa Livre / Carrinho Vazio</p>
                <p className="text-xs text-zinc-600 mt-1">Passe os produtos no leitor de código de barras</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-surface-card border border-surface-border hover:border-primary-500/30 transition text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-zinc-100">{item.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">
                        {item.quantity} un x {formatCurrency(item.unitPrice)}
                        {item.trackLots && <span className="ml-2 text-primary-400 text-[10px] uppercase font-bold">FEFO</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-zinc-800/80 rounded-lg p-1">
                      <button
                        onClick={() => {
                          setCart((prev) =>
                            prev
                              .map((i) =>
                                i.productId === item.productId
                                  ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.unitPrice }
                                  : i,
                              )
                              .filter((i) => i.quantity > 0),
                          );
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => {
                          setCart((prev) =>
                            prev.map((i) =>
                              i.productId === item.productId
                                ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
                                : i,
                            ),
                          );
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-zinc-100 min-w-[80px] text-right">
                      {formatCurrency(item.total)}
                    </span>

                    <button
                      onClick={() => setCart((prev) => prev.filter((i) => i.productId !== item.productId))}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition"
                      title="Remover Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Atalhos Rápidos no Rodapé */}
          <div className="p-3 border-t border-surface-border bg-surface-card/40 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-primary-400 font-mono">F2</kbd> Pagamento</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-primary-400 font-mono">F4</kbd> Desconto</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-primary-400 font-mono">F6</kbd> Cliente</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-primary-400 font-mono">F8</kbd> Limpar</span>
            </div>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-primary-400 font-mono">ESC</kbd> Cancelar</span>
          </div>
        </div>

        {/* Coluna Direita: Resumo Financeiro & Finalização (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-surface border border-surface-border rounded-2xl p-6 shadow-xl">
          <div className="space-y-4">
            {/* Header Cliente */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-card border border-surface-border">
              <div className="flex items-center gap-2 text-xs">
                <UserCheck className="w-4 h-4 text-primary-400" />
                <span className="font-semibold text-zinc-200">{selectedCustomerName}</span>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="text-xs font-semibold text-primary-400 hover:underline"
              >
                Alterar (F6)
              </button>
            </div>

            {/* Totalizadores */}
            <div className="p-4 rounded-xl bg-surface-card/60 border border-surface-border space-y-3">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal dos Itens:</span>
                <span className="font-mono text-zinc-200">{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-sm text-red-400">
                  <span>Desconto Aplicado:</span>
                  <span className="font-mono">- {formatCurrency(discountTotal)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-surface-border flex justify-between items-baseline">
                <span className="text-base font-bold text-zinc-100 uppercase tracking-wider">Total a Pagar</span>
                <span className="text-3xl font-black font-mono text-primary-400">{formatCurrency(totalSale)}</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação Principal */}
          <div className="space-y-3 pt-6">
            <button
              onClick={() => {
                setShowPaymentModal(true);
                setPaymentAmountInput(remainingToPay.toFixed(2));
              }}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-black text-lg transition flex items-center justify-center gap-3 shadow-xl shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-6 h-6" />
              <span>Receber / Pagamento (F2)</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDiscountModal(true)}
                disabled={cart.length === 0}
                className="py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-xs font-bold text-zinc-300 border border-surface-border flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                <Percent className="w-4 h-4 text-primary-400" />
                <span>Desconto (F4)</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Deseja cancelar esta venda?')) {
                    setCart([]);
                    setDiscountTotal(0);
                    setPayments([]);
                  }
                }}
                disabled={cart.length === 0}
                className="py-2.5 rounded-xl bg-surface-card hover:bg-red-500/20 text-xs font-bold text-zinc-300 hover:text-red-400 border border-surface-border flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar (F8)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE PAGAMENTO */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-400" />
                <span>Finalizar Pagamento (PDV)</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Total e Saldo Restante */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-surface-card rounded-xl text-center">
              <div>
                <p className="text-[11px] text-zinc-400 uppercase font-semibold">Total Venda</p>
                <p className="text-base font-bold text-zinc-100 font-mono mt-0.5">{formatCurrency(totalSale)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase font-semibold">Total Pago</p>
                <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase font-semibold">
                  {changeAmount > 0 ? 'Troco' : 'Falta Pagar'}
                </p>
                <p
                  className={`text-base font-black font-mono mt-0.5 ${
                    changeAmount > 0 ? 'text-primary-400' : 'text-amber-400'
                  }`}
                >
                  {formatCurrency(changeAmount > 0 ? changeAmount : remainingToPay)}
                </p>
              </div>
            </div>

            {/* Seleção da Forma de Pagamento */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                { id: 'PIX', label: 'PIX', icon: QrCode },
                { id: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
                { id: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = currentPaymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setCurrentPaymentMethod(m.id);
                      setPaymentAmountInput(remainingToPay.toFixed(2));
                    }}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary-500/20 border-primary-400 text-primary-400'
                        : 'bg-surface-card border-surface-border text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inserir Valor */}
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-base font-mono text-zinc-100 focus:outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={handleAddPayment}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl text-xs transition"
              >
                + Adicionar Parcela
              </button>
            </div>

            {/* Lista de Pagamentos Inseridos */}
            {payments.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-surface-card text-xs">
                    <span className="font-semibold text-zinc-300">{p.method}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-400 font-bold">{formatCurrency(p.amount)}</span>
                      <button
                        onClick={() => setPayments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de Conclusão */}
            <div className="pt-3 border-t border-surface-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-300 font-semibold"
              >
                Voltar (ESC)
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isFinalizing || (totalPaid < totalSale && payments.length > 0)}
                className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-sm shadow-lg shadow-primary-500/25 disabled:opacity-40"
              >
                {isFinalizing ? 'Processando Transação...' : 'Concluir Venda (F10)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO / COMPROVANTE */}
      {showSuccessModal && lastSaleResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white">Venda Concluída!</h3>
            <p className="text-xs text-zinc-400">Código: {lastSaleResult.code}</p>

            <div className="p-4 bg-surface-card rounded-xl text-left text-xs space-y-2 border border-surface-border font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total:</span>
                <span className="text-zinc-100 font-bold">{formatCurrency(lastSaleResult.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Itens:</span>
                <span className="text-zinc-100">{lastSaleResult.items?.length || 0} produtos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status Fiscal:</span>
                <span className="text-primary-400">NFC-e Emitida / SEFAZ</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-200 font-bold flex items-center justify-center gap-2 border border-surface-border"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Cupom</span>
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-xs"
              >
                Nova Venda (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DESCONTO */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Aplicar Desconto Geral</h3>
            <div>
              <label className="text-xs text-zinc-400">Valor do Desconto (R$)</label>
              <input
                type="number"
                step="0.10"
                value={discountTotal}
                onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-base font-mono text-zinc-100 focus:outline-none focus:border-primary-400"
              />
            </div>
            <button
              onClick={() => setShowDiscountModal(false)}
              className="w-full py-2.5 bg-primary-500 text-black font-bold rounded-xl text-xs"
            >
              Confirmar Desconto
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CLIENTE */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Identificar Cliente</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setSelectedCustomerName('Consumidor Final');
                  setShowCustomerModal(false);
                }}
                className="w-full p-3 rounded-xl bg-surface-card hover:bg-surface-border text-left text-xs text-zinc-200 border border-surface-border font-semibold"
              >
                Consumidor Final (Padrão)
              </button>
              {customers?.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setSelectedCustomerName(c.name);
                    setShowCustomerModal(false);
                  }}
                  className="w-full p-3 rounded-xl bg-surface-card hover:bg-surface-border text-left text-xs text-zinc-200 border border-surface-border"
                >
                  <p className="font-bold text-zinc-100">{c.name}</p>
                  <p className="text-[11px] text-zinc-400">CPF/CNPJ: {c.document || 'Não informado'}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="w-full py-2 bg-surface-card text-zinc-300 rounded-xl text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
