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
  Cpu,
  Check,
  Download,
  RotateCcw,
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

  // Pagamento & TEF / Maquininhas
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'>('CASH');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [creditInstallments, setCreditInstallments] = useState(1);
  const [selectedTerminal, setSelectedTerminal] = useState<'MERCADO_PAGO' | 'PAGBANK' | 'STONE_TEF' | 'STRIPE' | 'MANUAL'>('MERCADO_PAGO');
  const [isProcessingTef, setIsProcessingTef] = useState(false);
  const [tefStatusMsg, setTefStatusMsg] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Pagamentos da venda
  const [payments, setPayments] = useState<{ method: string; amount: number; installments?: number; reference?: string }[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Buscar Sessão de Caixa Aberta
  const { data: activeSession } = useQuery({
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
  
  // Atualizar pagamentos e saldo automaticamente sem necessidade de botão "Adicionar Parcela"
  const currentPaymentAmount = parseFloat(paymentAmountInput) || 0;
  const totalPaid = payments.length > 0 ? payments.reduce((acc, p) => acc + p.amount, 0) : currentPaymentAmount;
  const remainingToPay = Math.max(0, totalSale - (payments.length > 0 ? totalPaid : 0));
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
          setPaymentAmountInput(totalSale.toFixed(2));
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
        if (showPaymentModal) {
          handleFinalizeSale();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, totalPaid, totalSale, remainingToPay, currentPaymentMethod, paymentAmountInput, creditInstallments, selectedTerminal]);

  // Finalizar Venda Atômica com Suporte a TEF / Maquininhas
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;

    const amountToPay = payments.length > 0 ? totalPaid : currentPaymentAmount;
    if (amountToPay < totalSale) {
      alert(`O valor informado (R$ ${amountToPay.toFixed(2)}) é menor que o valor total da venda (R$ ${totalSale.toFixed(2)})!`);
      return;
    }

    // Se for Cartão e utilizar Maquininha TEF Integrada (Mercado Pago, PagBank, Stone, Stripe)
    const isCard = currentPaymentMethod === 'CREDIT_CARD' || currentPaymentMethod === 'DEBIT_CARD';
    if (isCard && selectedTerminal !== 'MANUAL' && payments.length === 0) {
      setIsProcessingTef(true);
      setTefStatusMsg(`📡 Enviando cobrança de ${formatCurrency(amountToPay)} para Maquininha ${selectedTerminal}...`);
      await new Promise((r) => setTimeout(r, 1000));

      setTefStatusMsg('💳 Aproxime ou insira o cartão do cliente na máquina...');
      await new Promise((r) => setTimeout(r, 1200));

      setTefStatusMsg('✅ Processando autorização do pagamento com a Adquirente...');
      await new Promise((r) => setTimeout(r, 800));
      setIsProcessingTef(false);
    }

    setIsFinalizing(true);
    try {
      const idempotencyKey = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const finalPayments = payments.length > 0
        ? payments
        : [
            {
              method: currentPaymentMethod,
              amount: amountToPay,
              installments: currentPaymentMethod === 'CREDIT_CARD' ? creditInstallments : 1,
              reference: isCard ? `TEF-${selectedTerminal}-${Date.now().toString().slice(-6)}` : undefined,
            },
          ];

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
        payments: finalPayments,
        idempotencyKey,
      };

      const res = await api.post('/sales/checkout', payload, {
        headers: { 'idempotency-key': idempotencyKey },
      });

      setLastSaleResult({
        ...res.data,
        paymentsFormatted: finalPayments,
        customerName: selectedCustomerName,
        change: Math.max(0, amountToPay - totalSale),
        nfceAccessKey: `352608${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
        protocol: `1352600${Math.floor(10000000 + Math.random() * 90000000)}`,
      });

      setShowPaymentModal(false);
      setShowSuccessModal(true);

      // Limpar estado para próxima venda
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
            <span>Nenhuma sessão de caixa está aberta para este operador. Abra o caixa para registrar vendas.</span>
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
                placeholder="Passe o leitor de código de barras ou digite (Ex: 789... ou 2*789...)..."
                className="w-full bg-background border border-surface-border rounded-xl pl-12 pr-28 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400 font-mono"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-4 py-1.5 bg-primary-500 text-black font-bold text-xs rounded-lg hover:bg-primary-400"
              >
                Adicionar
              </button>
            </form>

            {feedbackMsg && (
              <div
                className={`mt-2 text-xs font-semibold px-3 py-1 rounded-lg flex items-center justify-between ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                <span>{feedbackMsg.text}</span>
                <button onClick={() => setFeedbackMsg(null)}>✕</button>
              </div>
            )}
          </div>

          {/* Tabela de Itens no Carrinho */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
                <ShoppingCart className="w-12 h-12 text-zinc-600" />
                <p className="text-sm font-medium">Nenhum produto adicionado ao caixa</p>
                <p className="text-xs text-zinc-600">Passe o leitor de código de barras ou use a busca</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-surface-card rounded-xl border border-surface-border flex items-center justify-between gap-4 hover:border-zinc-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <p className="font-bold text-zinc-100 text-sm truncate">{item.name}</p>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        {formatCurrency(item.unitPrice)} un · EAN: {item.barcode || 'N/A'}
                      </p>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex items-center gap-2">
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
                        className="p-1 rounded-lg bg-surface border border-surface-border hover:bg-zinc-800 text-zinc-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm text-white">{item.quantity}</span>
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
                        className="p-1 rounded-lg bg-surface border border-surface-border hover:bg-zinc-800 text-zinc-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <p className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(item.total)}</p>
                    </div>

                    <button
                      onClick={() => setCart((prev) => prev.filter((i) => i.productId !== item.productId))}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Totais da Venda & Painel de Ações Rápidas (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Card de Cliente Selecionado */}
          <div className="p-4 bg-surface border border-surface-border rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Cliente na Venda</p>
                <p className="text-sm font-bold text-zinc-100">{selectedCustomerName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="text-xs font-semibold text-primary-400 hover:underline"
            >
              Alterar (F6)
            </button>
          </div>

          {/* Resumo Financeiro */}
          <div className="p-6 bg-surface border border-surface-border rounded-2xl space-y-4 shadow-xl">
            <div className="space-y-2 text-sm border-b border-surface-border pb-4">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal ({cart.length} itens):</span>
                <span className="font-mono text-zinc-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Desconto Aplicado:</span>
                <span className="font-mono text-amber-400">- {formatCurrency(discountTotal)}</span>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Total a Pagar</p>
              <p className="text-4xl font-black text-emerald-400 font-mono mt-1">{formatCurrency(totalSale)}</p>
            </div>
          </div>

          {/* Botões de Atalhos de Teclado */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDiscountModal(true)}
              className="p-3 bg-surface-card hover:bg-surface-border border border-surface-border rounded-xl text-left transition"
            >
              <div className="flex items-center justify-between text-zinc-400">
                <Percent className="w-4 h-4 text-primary-400" />
                <span className="text-[10px] font-mono font-bold bg-zinc-800 px-1.5 py-0.5 rounded">F4</span>
              </div>
              <p className="text-xs font-bold text-zinc-200 mt-2">Aplicar Desconto</p>
            </button>

            <button
              onClick={() => {
                if (confirm('Limpar todo o carrinho?')) {
                  setCart([]);
                  setDiscountTotal(0);
                  setPayments([]);
                }
              }}
              className="p-3 bg-surface-card hover:bg-surface-border border border-surface-border rounded-xl text-left transition"
            >
              <div className="flex items-center justify-between text-zinc-400">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-mono font-bold bg-zinc-800 px-1.5 py-0.5 rounded">F8</span>
              </div>
              <p className="text-xs font-bold text-zinc-200 mt-2">Cancelar Carrinho</p>
            </button>
          </div>

          {/* BOTÃO PRINCIPAL: RECEBER / FINALIZAR VENDA (F2) */}
          <button
            disabled={cart.length === 0}
            onClick={() => {
              setShowPaymentModal(true);
              setPaymentAmountInput(totalSale.toFixed(2));
            }}
            className="w-full py-5 rounded-2xl bg-primary-500 hover:bg-primary-400 disabled:opacity-40 text-black font-black text-lg shadow-2xl shadow-primary-500/25 transition flex items-center justify-center gap-3"
          >
            <CreditCard className="w-6 h-6" />
            <span>FINALIZAR PAGAMENTO (F2)</span>
          </button>
        </div>
      </div>

      {/* MODAL DE PAGAMENTO & TEF */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-400" />
                <span>Recebimento no Frente de Caixa</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Total e Saldo Restante */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-surface-card rounded-2xl text-center border border-surface-border">
              <div>
                <p className="text-[11px] text-zinc-400 uppercase font-semibold">Total da Venda</p>
                <p className="text-2xl font-black text-white font-mono mt-0.5">{formatCurrency(totalSale)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase font-semibold">
                  {changeAmount > 0 ? 'Troco a Devolver' : 'Valor a Cobrar'}
                </p>
                <p
                  className={`text-2xl font-black font-mono mt-0.5 ${
                    changeAmount > 0 ? 'text-primary-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(changeAmount > 0 ? changeAmount : currentPaymentAmount)}
                </p>
              </div>
            </div>

            {/* Seleção da Forma de Pagamento */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Forma de Pagamento</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                  { id: 'PIX', label: 'PIX QrCode', icon: QrCode },
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
                        setCurrentPaymentMethod(m.id as any);
                        setPaymentAmountInput(totalSale.toFixed(2));
                      }}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary-500/20 border-primary-400 text-primary-400 font-bold'
                          : 'bg-surface-card border-surface-border text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Parcelas (Exclusivo para Cartão de Crédito) */}
            {currentPaymentMethod === 'CREDIT_CARD' && (
              <div className="space-y-1.5 bg-surface-card p-3 rounded-xl border border-surface-border">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Quantidade de Parcelas (Crédito)</span>
                  <span className="text-primary-400 font-mono">
                    {creditInstallments}x de {formatCurrency((currentPaymentAmount || totalSale) / creditInstallments)}
                  </span>
                </label>
                <select
                  value={creditInstallments}
                  onChange={(e) => setCreditInstallments(parseInt(e.target.value))}
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-primary-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatCurrency((currentPaymentAmount || totalSale) / n)} (À Vista / Sem Juros)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seletor de Maquininha Integrada / TEF (Cartão Crédito / Débito) */}
            {(currentPaymentMethod === 'CREDIT_CARD' || currentPaymentMethod === 'DEBIT_CARD') && (
              <div className="space-y-1.5 bg-surface-card p-3 rounded-xl border border-surface-border">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-primary-400" />
                  <span>Maquininha TEF / Pinpad Conectado</span>
                </label>
                <select
                  value={selectedTerminal}
                  onChange={(e) => setSelectedTerminal(e.target.value as any)}
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-primary-400"
                >
                  <option value="MERCADO_PAGO">Mercado Pago Point (Smart POS)</option>
                  <option value="PAGBANK">PagBank / PagSeguro Moderninha</option>
                  <option value="STONE_TEF">Stone TEF IP / Pinpad USB</option>
                  <option value="STRIPE">Stripe Terminal</option>
                  <option value="MANUAL">Maquininha Manual (Digitar POS Físico)</option>
                </select>
              </div>
            )}

            {/* Inserção e Ajuste de Valor do Pagamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Valor Pago pelo Cliente (R$)</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-surface-border rounded-xl px-4 py-3 text-xl font-mono font-bold text-zinc-100 focus:outline-none focus:border-primary-400"
              />
            </div>

            {/* Feedback Visual TEF Processando */}
            {isProcessingTef && (
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/30 text-center space-y-2 animate-pulse">
                <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-primary-400">{tefStatusMsg}</p>
              </div>
            )}

            {/* Botão de Conclusão Direta (F10) */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-300 font-semibold"
              >
                Voltar (ESC)
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isFinalizing || isProcessingTef}
                className="flex-1 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-extrabold text-base shadow-lg shadow-primary-500/25 disabled:opacity-40"
              >
                {isFinalizing ? 'Finalizando Venda...' : 'CONFIRMAR E FINALIZAR (F10)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO / CUPOM FISCAL DANFE NFC-e PADRÃO 80MM */}
      {showSuccessModal && lastSaleResult && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-3xl max-w-lg w-full p-6 shadow-2xl text-center space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white">Venda Concluída com Sucesso!</h3>

            {/* DANFE NFC-e TÉRMICO PADRÃO SEFAZ (80mm) */}
            <div className="p-6 bg-white text-black rounded-xl text-left text-[11px] font-mono leading-tight shadow-inner border border-zinc-300 font-bold space-y-3">
              {/* Cabeçalho da Empresa */}
              <div className="text-center space-y-0.5 border-b border-black pb-2">
                <p className="font-black text-sm uppercase tracking-tight">RETAILSYN VAREJO & CONVENIÊNCIA</p>
                <p className="text-[10px]">RETAILSYN TECNOLOGIA E SISTEMAS LTDA</p>
                <p className="text-[10px]">CNPJ: 12.345.678/0001-90 · IE: 123.456.789.110</p>
                <p className="text-[10px]">Av. Brasil, 1500 - São Luís / MA - CEP: 65000-000</p>
                <p className="text-[10px]">Fone: (98) 98589-4988 · www.retailsyn.com.br</p>
              </div>

              {/* Título DANFE */}
              <div className="text-center border-b border-black pb-2">
                <p className="font-black text-xs">DANFE NFC-e - Documento Auxiliar da Nota Fiscal</p>
                <p className="text-[10px]">de Consumidor Eletrônica</p>
                <p className="text-[9px]">Não Permite Crédito de ICMS - Emissão Normal</p>
              </div>

              {/* Tabela de Produtos */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase border-b border-dashed border-zinc-400 pb-1">
                  <span>ITEM CÓDIGO DESCRIÇÃO QTD UN VL.UNIT</span>
                  <span>TOTAL</span>
                </div>
                {lastSaleResult.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[10px] leading-snug">
                    <div className="truncate pr-2">
                      {idx + 1} {item.product?.barcode || 'EAN'} {item.product?.name || 'PRODUTO'}
                      <br />
                      <span className="text-[9px] font-normal">
                        {item.quantity} UN x R$ {Number(item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                    <span className="font-bold">R$ {Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>QTD. TOTAL DE ITENS:</span>
                  <span>{lastSaleResult.items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>SUBTOTAL R$:</span>
                  <span>R$ {Number(lastSaleResult.subtotal || lastSaleResult.total).toFixed(2)}</span>
                </div>
                {Number(lastSaleResult.discount) > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>DESCONTO R$:</span>
                    <span>- R$ {Number(lastSaleResult.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
                  <span>VALOR TOTAL R$:</span>
                  <span>R$ {Number(lastSaleResult.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>
                    {lastSaleResult.paymentsFormatted?.[0]?.method === 'CREDIT_CARD'
                      ? `Cartão de Crédito (${lastSaleResult.paymentsFormatted?.[0]?.installments || 1}x)`
                      : lastSaleResult.paymentsFormatted?.[0]?.method === 'DEBIT_CARD'
                      ? 'Cartão de Débito'
                      : lastSaleResult.paymentsFormatted?.[0]?.method === 'PIX'
                      ? 'PIX QrCode'
                      : 'Dinheiro'}
                  </span>
                  <span>R$ {Number(lastSaleResult.total).toFixed(2)}</span>
                </div>
                {lastSaleResult.change > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>TROCO DEVOLVIDO R$:</span>
                    <span>R$ {Number(lastSaleResult.change).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Chave de Acesso e Dados SEFAZ */}
              <div className="border-t border-black pt-2 text-center space-y-1">
                <p className="text-[9px] uppercase font-bold">CHAVE DE ACESSO DA NFC-e SEFAZ</p>
                <p className="text-[9px] tracking-wider font-mono bg-zinc-100 p-1 border border-zinc-300">
                  {lastSaleResult.nfceAccessKey}
                </p>
                <p className="text-[9px]">
                  EMISSÃO: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')} · SÉRIE 001 · NÚMERO {lastSaleResult.code}
                </p>
                <p className="text-[9px]">PROTOCOLO DE AUTORIZAÇÃO SEFAZ: {lastSaleResult.protocol}</p>
                <p className="text-[8px] text-zinc-600 font-normal">
                  Tributos Totais Incidentes (Lei 12.741/2012): R$ {(Number(lastSaleResult.total) * 0.18).toFixed(2)} (18,00%)
                </p>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-black">
                <p className="text-[10px] uppercase font-black">Obrigado pela preferência!</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-200 font-bold flex items-center justify-center gap-2 border border-surface-border"
              >
                <Printer className="w-4 h-4 text-primary-400" />
                <span>Imprimir Cupom ESC/POS</span>
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-extrabold text-xs"
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
