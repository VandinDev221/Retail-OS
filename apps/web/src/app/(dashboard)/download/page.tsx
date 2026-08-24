'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  HardDrive,
  Printer,
  Scale,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Lock,
  Sparkles,
  FileCode,
} from 'lucide-react';
import Link from 'next/link';

export default function DownloadPage() {
  const { data: releaseInfo, isLoading, isError, error } = useQuery({
    queryKey: ['installer-release'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/installer/download');
      return res.data;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription-download'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/my-subscription');
      return res.data;
    },
  });

  const isBlocked = isError || !releaseInfo?.downloadAuthorized;

  const [downloading, setDownloading] = useState(false);

  const handleDownloadFile = () => {
    if (isBlocked) return;
    setDownloading(true);

    try {
      const fileUrl = releaseInfo?.fileUrl || '/downloads/RetailSyn-PDV-Setup-1.2.0.exe';
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = 'RetailSyn-PDV-Setup-1.2.0.exe';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao acionar download:', err);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Monitor className="w-6 h-6 text-primary-400" />
            <span>Aplicativo Desktop RetailSyn PDV (.exe)</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Instalador executável para Windows com suporte nativo a Impressora Térmica, Balança e Leitor de Código de Barras
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-card border border-surface-border text-xs">
          {!isBlocked ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300 font-semibold">Licença SaaS:</span>
              <span className="font-bold text-emerald-400 uppercase">Ativa — Download Liberado</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-300 font-semibold">Licença SaaS:</span>
              <span className="font-bold text-amber-400 uppercase">Bloqueado / Requer Assinatura</span>
            </>
          )}
        </div>
      </div>

      {/* Main Download Action Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-surface-card via-surface to-surface-card border border-surface-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Versão Oficial v1.2.0 para Windows 10/11</span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              RetailSyn PDV Desktop Executável (.exe)
            </h2>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {releaseInfo?.releaseNotes ||
                'Suporte nativo a balança comercial (Toledo / Filizola), leitor de código de barras USB/Serial e impressora térmica de cupom ESC/POS.'}
            </p>

            <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-400 pt-2">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-primary-400" />
                <span>Tamanho: 48 MB</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Arquivo: RetailSyn-PDV-Setup-1.2.0.exe</span>
              </span>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-center gap-3">
            {!isBlocked ? (
              <button
                onClick={handleDownloadFile}
                disabled={downloading}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-primary-500 hover:bg-primary-400 text-black font-extrabold text-sm shadow-xl shadow-primary-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>{downloading ? 'Iniciando Download...' : 'Baixar Instalador Windows (.exe)'}</span>
              </button>
            ) : (
              <div className="w-full md:w-auto text-center space-y-3">
                <button
                  disabled
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-zinc-800 text-zinc-500 font-extrabold text-sm border border-zinc-700 cursor-not-allowed"
                >
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Download Bloqueado</span>
                </button>
                <p className="text-xs text-amber-400 font-semibold max-w-xs">
                  Sua assinatura está inativa. Faça o pagamento ou regularize seu plano para liberar o download.
                </p>
                <Link
                  href="/settings"
                  className="inline-block text-xs text-primary-400 hover:underline font-bold"
                >
                  Ir para Configurações / Assinatura →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Passo a Passo Completo de Instalação */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-sm">
            1
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Passo a Passo de Instalação e Configuração no PDV
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Passo 1 */}
          <div className="p-6 bg-surface border border-surface-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-primary-500 text-black font-black text-xs flex items-center justify-center">
                1
              </span>
              <Download className="w-5 h-5 text-primary-400" />
            </div>
            <h3 className="text-base font-bold text-white">Baixar o Arquivo Executável</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Clique no botão verde <strong>"Baixar Instalador Windows (.exe)"</strong> acima. O arquivo executável <code className="text-primary-400 bg-surface-card px-1.5 py-0.5 rounded font-mono">RetailSyn-PDV-Setup-1.2.0.exe</code> será salvo na pasta de downloads do seu computador.
            </p>
          </div>

          {/* Passo 2 */}
          <div className="p-6 bg-surface border border-surface-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-primary-500 text-black font-black text-xs flex items-center justify-center">
                2
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">Executar o Instalador no Windows</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Clique duas vezes no arquivo baixado. Se o filtro do Windows Defender (SmartScreen) exibir um aviso de proteção, clique em <strong>"Mais informações"</strong> e depois em <strong>"Executar assim mesmo"</strong> para concluir a instalação automática.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="p-6 bg-surface border border-surface-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-primary-500 text-black font-black text-xs flex items-center justify-center">
                3
              </span>
              <Printer className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white">Configurar Impressora & Balança</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Na tela inicial do aplicativo instalado, acesse a aba <strong>Configurações de Hardware</strong> e selecione a porta de comunicação da sua Impressora Térmica de Cupom (ESC/POS) e o protocolo da Balança Comercial (Toledo Prix / Filizola).
            </p>
          </div>

          {/* Passo 4 */}
          <div className="p-6 bg-surface border border-surface-border rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-primary-500 text-black font-black text-xs flex items-center justify-center">
                4
              </span>
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white">Login e Operação do Balcão</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Faça login com seu e-mail e senha cadastrados. O sistema realizará a primeira sincronização de produtos, lotes FEFO e caixa registrador automaticamente. Seu PDV estará pronto para realizar vendas!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
