'use client';

import React from 'react';
import { Bell, Store, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/auth-context';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-surface-border bg-surface/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-zinc-300">
          <Store className="w-3.5 h-3.5 text-primary-400" />
          <span className="font-semibold text-zinc-100">{user?.tenantName || 'Loja Principal'}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online / Produção</span>
        </div>

        <button className="p-2 rounded-lg bg-surface-card border border-surface-border text-zinc-400 hover:text-zinc-100 transition relative">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
