'use client';

import React, { useEffect, useState } from 'react';
import { Monitor, Maximize2, Minimize2, Minus, X, Wifi } from 'lucide-react';

export function DesktopTitlebar() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      const isElectron = userAgent.includes('electron') || !!(window as any).electron;
      setIsDesktop(isElectron);

      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleMinimize = () => {
    if ((window as any).electron?.minimize) {
      (window as any).electron.minimize();
    }
  };

  const handleClose = () => {
    if ((window as any).electron?.close) {
      (window as any).electron.close();
    } else {
      window.close();
    }
  };

  if (!isDesktop) return null;

  return (
    <div 
      className="h-9 bg-[#090A0F] border-b border-[#262B3D] text-zinc-300 flex items-center justify-between px-3 text-xs select-none z-50 sticky top-0"
      style={{ backgroundColor: '#090A0F', borderColor: '#262B3D' }}
    >
      {/* Title & App Info */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md bg-[#C29B27] flex items-center justify-center text-black font-extrabold text-[10px]">
          RS
        </div>
        <span className="font-bold text-white tracking-tight">RetailSyn PDV Desktop</span>
        <span className="px-1.5 py-0.5 rounded bg-[#181B26] border border-[#262B3D] text-[10px] text-zinc-400 font-mono">
          v1.2.0
        </span>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold ml-2">
          <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Tempo Real Activo</span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleFullscreen}
          className="p-1 rounded hover:bg-[#181B26] text-zinc-400 hover:text-white transition flex items-center gap-1 px-2"
          title={isFullscreen ? 'Sair do Modo Kiosk (F11)' : 'Modo Kiosk Tela Cheia (F11)'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden md:inline text-[10px] font-mono">{isFullscreen ? 'Janela' : 'Kiosk'}</span>
        </button>

        <button
          onClick={handleMinimize}
          className="p-1.5 rounded hover:bg-[#181B26] text-zinc-400 hover:text-white transition"
          title="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          className="p-1.5 rounded hover:bg-red-600 hover:text-white text-zinc-400 transition ml-1"
          title="Fechar Aplicativo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
