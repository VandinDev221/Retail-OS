'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  Printer,
  CheckCircle,
} from 'lucide-react';

export default function CashPage() {
  const queryClient = useQueryClient();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportSessionId, setSelectedReportSessionId] = useState<string | null>(null);

  // Form states
  const [initialBalance, setInitialBalance] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [reportedBalance, setReportedBalance] = useState('');
  const [justification, setJustification] = useState('');

  // Queries
  const { data: registers } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: async () => {
      const res = await api.get('/cash/registers');
      return res.data;
    },
  });

  const { data: activeSession, isLoading: loadingSession } = useQuery({
    queryKey: ['active-cash-session'],
    queryFn: async () => {
      const res = await api.get('/cash/active-session');
      return res.data;
    },
  });

  const { data: sessionReport } = useQuery({
    queryKey: ['session-report', selectedReportSessionId],
    queryFn: async () => {
      if (!selectedReportSessionId) return null;
      const res = await api.get(`/cash/sessions/${selectedReportSessionId}/report`);
      return res.data;
    },
    enabled: !!selectedReportSessionId,
  });

  // Abertura de Caixa
  const openMutation = useMutation({
    mutationFn: async () => {
      const registerId = registers?.[0]?.id;
      if (!registerId) throw new Error('Nenhum caixa registrador cadastrado');
      await api.post('/cash/open', {
        cashRegisterId: registerId,
        initialBalance: parseFloat(initialBalance) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-cash-session'] });
      queryClient.invalidateQueries({ queryKey: ['pos-active-session'] });
      setShowOpenModal(false);
      setInitialBalance('');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao abrir caixa'),
  });

  // Suprimento
  const suprimentoMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/cash/sessions/${activeSession.id}/suprimento`, {
        amount: parseFloat(movementAmount),
        reason: movementReason || 'Suprimento / Troco',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-cash-session'] });
      setShowSuprimentoModal(false);
      setMovementAmount('');
      setMovementReason('');
    },
  });

  // Sangria
  const sangriaMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/cash/sessions/${activeSession.id}/sangria`, {
        amount: parseFloat(movementAmount),
        reason: movementReason || 'Sangria de segurança',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-cash-session'] });
      setShowSangriaModal(false);
      setMovementAmount('');
      setMovementReason('');
    },
  });

  // Fechamento Cego
  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cash/sessions/${activeSession.id}/close`, {
        reportedBalance: parseFloat(reportedBalance) || 0,
        justification,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['active-cash-session'] });
      queryClient.invalidateQueries({ queryKey: ['pos-active-session'] });
      setShowCloseModal(false);
      setSelectedReportSessionId(data.id);
      setShowReportModal(true);
      setReportedBalance('');
      setJustification('');
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao fechar caixa'),
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Controle & Gestão de Caixa</h1>
          <p className="text-sm text-zinc-400">Abertura, suprimentos, sangrias e fechamento cego de sessões</p>
        </div>

        <div>
          {!activeSession ? (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-sm shadow-lg shadow-primary-500/20 transition"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Sessão de Caixa</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSuprimentoModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-emerald-400 border border-surface-border text-xs font-bold transition"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>Suprimento</span>
              </button>
              <button
                onClick={() => setShowSangriaModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-amber-400 border border-surface-border text-xs font-bold transition"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Sangria</span>
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Caixa Ativo Card */}
      {activeSession ? (
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h2 className="text-lg font-bold text-white">{activeSession.cashRegister.name}</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Aberto em {formatDate(activeSession.openedAt)} por {activeSession.openedBy.name}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedReportSessionId(activeSession.id);
                setShowReportModal(true);
              }}
              className="flex items-center gap-1.5 text-xs text-primary-400 hover:underline font-semibold"
            >
              <FileText className="w-4 h-4" />
              <span>Ver Relatório Parcial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
              <span className="text-xs text-zinc-400 font-semibold uppercase">Fundo Inicial</span>
              <p className="text-xl font-bold text-zinc-100 font-mono mt-1">
                {formatCurrency(activeSession.initialBalance)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
              <span className="text-xs text-zinc-400 font-semibold uppercase">Movimentações Registradas</span>
              <p className="text-xl font-bold text-zinc-100 font-mono mt-1">
                {activeSession.movements?.length || 0} lançamentos
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
              <span className="text-xs text-zinc-400 font-semibold uppercase">Status</span>
              <p className="text-xl font-bold text-emerald-400 uppercase mt-1">Sessão Ativa</p>
            </div>
          </div>

          {/* Histórico de Movimentações da Sessão */}
          <div>
            <h3 className="text-sm font-bold text-zinc-200 mb-3">Movimentações de Caixa (Suprimento / Sangria / Vendas)</h3>
            <div className="border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold">
                  <tr>
                    <th className="p-3">Horário</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Motivo / Descrição</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {activeSession.movements?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-zinc-500">
                        Nenhuma movimentação avulsa registrada.
                      </td>
                    </tr>
                  ) : (
                    activeSession.movements?.map((m: any) => (
                      <tr key={m.id} className="hover:bg-surface-card/40 transition">
                        <td className="p-3 text-zinc-400 font-mono">{formatDate(m.createdAt)}</td>
                        <td className="p-3 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                              m.type === 'SUPPLY' || m.type === 'OPENING' || m.type === 'SALE'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-300">{m.reason}</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-100">
                          {formatCurrency(m.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-surface border border-surface-border rounded-2xl space-y-4">
          <Wallet className="w-16 h-16 text-zinc-600 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-300">Nenhum Caixa Aberto no Momento</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Abra a sessão de caixa inserindo o valor do fundo de troco para iniciar as operações do dia.
          </p>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-6 py-2.5 bg-primary-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-primary-500/20"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* MODAL ABERTURA */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Unlock className="w-5 h-5 text-primary-400" />
              <span>Abertura de Caixa</span>
            </h3>
            <div>
              <label className="text-xs text-zinc-400 font-semibold">Valor do Fundo de Troco Inicial (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="Ex: 100.00"
                className="w-full mt-1.5 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-base font-mono text-zinc-100 focus:outline-none focus:border-primary-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => openMutation.mutate()}
                disabled={openMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary-500 text-black font-bold text-xs hover:bg-primary-400"
              >
                {openMutation.isPending ? 'Abrindo...' : 'Confirmar Abertura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPRIMENTO */}
      {showSuprimentoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-emerald-400">
              <ArrowDownCircle className="w-5 h-5" />
              <span>Registrar Suprimento (Entrada de Troco)</span>
            </h3>
            <div>
              <label className="text-xs text-zinc-400 font-semibold">Valor da Entrada (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="Ex: 50.00"
                className="w-full mt-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-base font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold">Motivo</label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ex: Reforço de moedas"
                className="w-full mt-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuprimentoModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => suprimentoMutation.mutate()}
                disabled={suprimentoMutation.isPending}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400"
              >
                Registrar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SANGRIA */}
      {showSangriaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-amber-400">
              <ArrowUpCircle className="w-5 h-5" />
              <span>Registrar Sangria (Retirada de Segurança)</span>
            </h3>
            <div>
              <label className="text-xs text-zinc-400 font-semibold">Valor da Retirada (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="Ex: 200.00"
                className="w-full mt-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-base font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold">Motivo</label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ex: Recolhimento para o cofre"
                className="w-full mt-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSangriaModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => sangriaMutation.mutate()}
                disabled={sangriaMutation.isPending}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400"
              >
                Registrar Retirada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO CEGO */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-red-400">
              <Lock className="w-5 h-5" />
              <span>Fechamento Cego de Caixa</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Conte o dinheiro físico presente na gaveta e informe abaixo. O sistema fará a conciliação automática com as vendas e registrará divergências se houver.
            </p>

            <div>
              <label className="text-xs text-zinc-400 font-semibold">Saldo Contado em Dinheiro na Gaveta (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={reportedBalance}
                onChange={(e) => setReportedBalance(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 bg-background border border-surface-border rounded-xl px-4 py-2.5 text-base font-mono text-zinc-100 focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold">Justificativa (obrigatória em caso de divergência)</label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                placeholder="Explique se houver diferença de caixa..."
                className="w-full mt-1 bg-background border border-surface-border rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-card text-xs text-zinc-300 font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-400"
              >
                {closeMutation.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RELATÓRIO DETALHADO DE FECHAMENTO */}
      {showReportModal && sessionReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-400" />
                <span>Relatório de Fechamento de Caixa</span>
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Cabeçalho */}
            <div className="p-3.5 bg-surface-card rounded-xl text-xs space-y-1 text-zinc-300 font-mono">
              <p>Caixa: {sessionReport.session.cashRegister.name}</p>
              <p>Operador: {sessionReport.session.openedBy.name}</p>
              <p>Abertura: {formatDate(sessionReport.session.openedAt)}</p>
              <p>Fechamento: {formatDate(sessionReport.session.closedAt)}</p>
            </div>

            {/* Conciliação de Saldos */}
            <div className="p-4 bg-surface-card rounded-xl border border-surface-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Fundo Inicial:</span>
                <span className="font-mono">{formatCurrency(sessionReport.metrics.initialBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Faturamento Total:</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(sessionReport.metrics.totalRevenue)}</span>
              </div>
              {sessionReport.metrics.expectedBalance !== null && (
                <>
                  <div className="flex justify-between border-t border-surface-border/60 pt-2">
                    <span className="text-zinc-400">Saldo Esperado em Dinheiro:</span>
                    <span className="font-mono font-bold">{formatCurrency(sessionReport.metrics.expectedBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Saldo Informado pelo Operador:</span>
                    <span className="font-mono font-bold">{formatCurrency(sessionReport.metrics.reportedBalance)}</span>
                  </div>
                  <div className="flex justify-between border-t border-surface-border/60 pt-2 font-bold">
                    <span>Divergência / Diferença:</span>
                    <span
                      className={`font-mono ${
                        (sessionReport.metrics.difference || 0) < 0
                          ? 'text-red-400'
                          : (sessionReport.metrics.difference || 0) > 0
                          ? 'text-emerald-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      {formatCurrency(sessionReport.metrics.difference || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Totalizadores por Forma de Pagamento */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 mb-2">Totais por Meio de Pagamento</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(sessionReport.metrics.paymentTotals || {}).map(([method, amount]: any) => (
                  <div key={method} className="p-2.5 rounded-lg bg-surface-card flex justify-between">
                    <span className="text-zinc-400">{method}:</span>
                    <span className="font-mono font-bold text-zinc-100">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-surface-border">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-surface-card hover:bg-surface-border text-xs text-zinc-200 font-bold flex items-center justify-center gap-2 border border-surface-border"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
