'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Sidebar } from '../../components/layout/sidebar';
import { Navbar } from '../../components/layout/navbar';
import LoginPage from '../(auth)/login/page';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center text-[#C29B27]"
        style={{ backgroundColor: '#090A0F', color: '#C29B27' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C29B27] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-zinc-400">Carregando RetailSyn...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === 'SUPER_ADMIN' && !pathname.startsWith('/super-admin')) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center text-[#C29B27]"
        style={{ backgroundColor: '#090A0F', color: '#C29B27' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C29B27] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-zinc-400">Redirecionando Super Admin...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#090A0F]" style={{ backgroundColor: '#090A0F' }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
