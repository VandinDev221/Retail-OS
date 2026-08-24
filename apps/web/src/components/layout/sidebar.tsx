'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Wallet,
  FileSpreadsheet,
  Settings,
  LogOut,
  Receipt,
  X,
  FileText,
  ShieldCheck,
  Building,
  Zap,
  Download,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/utils';

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCaixa = user?.role === 'CAIXA';

  // Menu do Super Admin (Apenas Gestão de Empresas e Usuários da Plataforma)
  const superAdminMenuItems = [
    { label: 'Empresas & Usuários', icon: Building, href: '/super-admin', highlight: true },
  ];

  // Menu do Caixa (Apenas Frente de Caixa, Controle de Caixa, Produtos e Baixar App)
  const caixaMenuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Frente de Caixa (PDV)', icon: ShoppingCart, href: '/pos', highlight: true },
    { label: 'Controle de Caixa', icon: Wallet, href: '/cash' },
    { label: 'Produtos & Catálogo', icon: Package, href: '/products' },
    { label: 'Baixar App Desktop', icon: Download, href: '/download' },
  ];

  // Menu Operacional de Loja (Admins e Gerentes)
  const storeMenuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Frente de Caixa (PDV)', icon: ShoppingCart, href: '/pos', highlight: true },
    { label: 'Controle de Caixa', icon: Wallet, href: '/cash' },
    { label: 'Produtos & Catálogo', icon: Package, href: '/products' },
    { label: 'Estoque & FEFO', icon: Boxes, href: '/inventory' },
    { label: 'Compras & Entrada', icon: Truck, href: '/purchases' },
    { label: 'Emissão Fiscal (NFe/NFCe)', icon: FileText, href: '/fiscal' },
    { label: 'Financeiro', icon: Receipt, href: '/finance' },
    { label: 'Relatórios & ABC', icon: FileSpreadsheet, href: '/reports' },
    { label: 'Baixar App Desktop', icon: Download, href: '/download' },
    { label: 'Configurações', icon: Settings, href: '/settings' },
  ];

  const menuItems = isSuperAdmin ? superAdminMenuItems : (isCaixa ? caixaMenuItems : storeMenuItems);

  const content = (
    <div className="flex flex-col justify-between h-full bg-surface border-r border-surface-border">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="RetailSyn" className="w-10 h-10 object-contain rounded-xl" />
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-tight">RetailSyn</h1>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                {isSuperAdmin ? 'Super Admin SaaS' : 'Estoque | Venda | Gestão'}
              </p>
            </div>
          </div>
          {setMobileOpen && (
            <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 font-bold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-card',
                  item.highlight && !isActive && 'text-primary-400/90 font-semibold',
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary-400' : 'text-zinc-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3.5 border-t border-surface-border bg-surface-card/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-primary-400">
              {user?.name?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name || 'Super Admin'}</p>
              <p className="text-[10px] text-primary-400 font-bold truncate">{user?.role || 'SUPER_ADMIN'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 flex-shrink-0">{content}</aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden flex">
          <div className="w-72 h-full">{content}</div>
          <div className="flex-1" onClick={() => setMobileOpen && setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
