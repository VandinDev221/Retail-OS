'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  FileText,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Search,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function FiscalPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'nfce' | 'nfe'>('nfce');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['fiscal-documents'],
    queryFn: async () => {
      const res = await api.get('/fiscal/documents');
      return res.data;
    },
  });

  const { data: fiscalStatus } = useQuery({
    queryKey: ['fiscal-status'],
    queryFn: async () => {
      const res = await api.get('/fiscal/status');
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      await api.post(`/fiscal/documents/${docId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      setCancelModalOpen(false);
      setSelectedDoc(null);
      setCancelReason('');
    },
    onError: (err: any) => {
      setCancelError(err?.response?.data?.message || 'Falha ao cancelar documento fiscal.');
    },
  });

  const filteredDocs = (documents || []).filter((doc: any) => {
    const isTypeMatch = tab === 'nfce' ? doc.type === 'NFCE' : doc.type === 'NFE';
    const isSearchMatch =
      !searchTerm ||
      doc.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.sale?.code?.toLowerCase().includes(searchTerm.toLowerCase());
    return isTypeMatch && isSearchMatch;
  });

  const handleDownloadXml = (doc: any) => {
    if (!doc.xml) return;
    const blob = new Blob([doc.xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe_${doc.key || doc.number}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Emissão & Documentos Fiscais</h1>
          <p className="text-sm text-zinc-400">Emissão de NFC-e (Vendas Varejo) e NF-e (Atacado / Devoluções) integradas à SEFAZ</p>
        </div>

        {/* Status Provedor SEFAZ */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-300">Provedor SEFAZ:</span>
          <span className="font-bold text-emerald-400 uppercase">{fiscalStatus?.environment || 'Ativo / Homologado'}</span>
        </div>
      </div>

      {/* Grid de Resumo Fiscal */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">NFC-e Emitidas</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {documents?.filter((d: any) => d.type === 'NFCE' && d.status === 'AUTHORIZED').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Cupons fiscais autorizados</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">NF-e Emitidas</span>
            <FileText className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-2xl font-black text-primary-400 font-mono">
            {documents?.filter((d: any) => d.type === 'NFE' && d.status === 'AUTHORIZED').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Notas fiscais completas</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Notas Rejeitadas</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {documents?.filter((d: any) => d.status === 'REJECTED').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Requerem correção fiscal</p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Notas Canceladas</span>
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {documents?.filter((d: any) => d.status === 'CANCELLED').length || 0}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Canceladas no prazo</p>
        </div>
      </div>

      {/* Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-surface-border pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('nfce')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'nfce'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>NFC-e (Cupom Eletrônico)</span>
          </button>
          <button
            onClick={() => setTab('nfe')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'nfe'
                ? 'border-primary-500 text-primary-400 bg-primary-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>NF-e (Nota Fiscal NFe)</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número, chave ou venda..."
            className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400 transition"
          />
        </div>
      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-card border-b border-surface-border text-zinc-400 font-semibold uppercase">
              <tr>
                <th className="p-4">Número / Série</th>
                <th className="p-4">Chave de Acesso</th>
                <th className="p-4">Cód. Venda</th>
                <th className="p-4">Emissão</th>
                <th className="p-4 text-right">Valor Venda</th>
                <th className="p-4 text-center">Status SEFAZ</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Carregando documentos fiscais...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Nenhum documento fiscal encontrado nesta categoria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-surface-card/50 transition">
                    <td className="p-4 font-bold text-white font-mono">
                      Nº {doc.number} <span className="text-zinc-500 font-normal">Série {doc.series}</span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-zinc-400 tracking-wider">
                      {doc.key ? `${doc.key.substring(0, 12)}...${doc.key.substring(36)}` : '-'}
                    </td>
                    <td className="p-4 font-mono font-bold text-primary-400">{doc.sale?.code || '-'}</td>
                    <td className="p-4 font-mono text-zinc-400">{formatDate(doc.issuedAt || doc.createdAt)}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(doc.sale?.total || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                          doc.status === 'AUTHORIZED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : doc.status === 'REJECTED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : doc.status === 'CANCELLED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {doc.status === 'AUTHORIZED' ? 'Autorizada' : doc.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-border text-zinc-200 border border-surface-border transition"
                          title="Visualizar DANFE / Detalhes"
                        >
                          <Printer className="w-3.5 h-3.5 text-primary-400" />
                        </button>

                        <button
                          onClick={() => handleDownloadXml(doc)}
                          className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-border text-zinc-200 border border-surface-border transition"
                          title="Baixar XML SEFAZ"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {doc.status === 'AUTHORIZED' && (
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setCancelModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                            title="Cancelar Nota Fiscal"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Impressão DANFE / Detalhes */}
      {selectedDoc && !cancelModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white">DANFE - Documento Auxiliar</h3>
                <p className="text-xs text-zinc-400">{selectedDoc.type === 'NFCE' ? 'NFC-e Eletrônica' : 'NF-e Eletrônica'}</p>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-zinc-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-card rounded-xl border border-surface-border space-y-1 font-mono">
                <p className="text-zinc-400 font-semibold">Chave de Acesso (44 dígitos):</p>
                <p className="text-primary-400 break-all">{selectedDoc.key || 'Em processamento'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-card rounded-xl border border-surface-border">
                  <span className="text-zinc-400">Número da Nota:</span>
                  <p className="font-bold text-white font-mono mt-0.5">{selectedDoc.number}</p>
                </div>
                <div className="p-3 bg-surface-card rounded-xl border border-surface-border">
                  <span className="text-zinc-400">Protocolo SEFAZ:</span>
                  <p className="font-bold text-emerald-400 font-mono mt-0.5">{selectedDoc.protocol || '-'}</p>
                </div>
              </div>

              <div className="p-3 bg-surface-card rounded-xl border border-surface-border space-y-1">
                <span className="text-zinc-400">Venda Vinculada:</span>
                <p className="font-bold text-white">Código #{selectedDoc.sale?.code}</p>
                <p className="text-emerald-400 font-mono font-bold">{formatCurrency(selectedDoc.sale?.total || 0)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-black font-bold text-xs hover:bg-primary-400 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir DANFE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento de Nota */}
      {cancelModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancelar Documento Fiscal</h3>
                <p className="text-xs text-zinc-400">Nota Nº {selectedDoc.number}</p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Justificativa do Cancelamento (Mínimo 15 caracteres)
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento para a SEFAZ..."
                className="w-full bg-surface-card border border-surface-border rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-xs font-semibold text-zinc-400"
              >
                Voltar
              </button>
              <button
                disabled={cancelReason.length < 15 || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ docId: selectedDoc.id, reason: cancelReason })}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-black font-bold text-xs transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Transmitindo...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
