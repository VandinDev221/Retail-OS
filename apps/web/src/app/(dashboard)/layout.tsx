'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Sidebar } from '../../components/layout/sidebar';
import { Navbar } from '../../components/layout/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && !pathname.includes('/login')) {
      router.push('/login');
      return;
    }

    if (!loading && user) {
      // Super Admin: acesso exclusivo para gestão de empresas e usuários (/super-admin)
      if (user.role === 'SUPER_ADMIN') {
        if (!pathname.startsWith('/super-admin')) {
          router.push('/super-admin');
        }
      } else if (user.role === 'CAIXA') {
        // Caixa: apenas Dashboard (/dashboard), PDV (/pos), Caixa (/cash) e Produtos (/products)
        const allowedPaths = ['/dashboard', '/pos', '/cash', '/products'];
        const isAllowed = allowedPaths.some((p) => pathname === p || pathname.startsWith(p));
        if (!isAllowed) {
          router.push('/pos');
        }
      } else {
        // Não-SuperAdmin tentando acessar rota do super admin
        if (pathname.startsWith('/super-admin')) {
          router.push('/dashboard');
        }
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-zinc-400">Carregando RetailSyn...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (user.role === 'SUPER_ADMIN' && !pathname.startsWith('/super-admin')) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-zinc-400">Redirecionando Super Admin...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
