'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { Lock, Mail, Store, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@retailos.com');
  const [password, setPassword] = useState('Admin@123456');
  const [tenantSlug, setTenantSlug] = useState('loja-matriz');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password, tenantSlug });
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl mx-auto flex items-center justify-center font-black text-black text-3xl shadow-xl shadow-primary-500/20 mb-4">
            R
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Retail OS</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestão de Conveniência & PDV Transacional</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-surface-border rounded-2xl p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Empresa (Slug)
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="loja-matriz"
                  className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@retailos.com"
                  className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary-500 hover:bg-primary-400 text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Acessar Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-surface-border/60">
            <p className="text-[11px] text-zinc-400 text-center font-medium mb-2">Credenciais padrão de demonstração:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@retailos.com');
                  setPassword('Admin@123456');
                }}
                className="p-2 rounded-lg bg-surface-card hover:bg-surface-border text-left border border-surface-border/80 transition"
              >
                <p className="font-semibold text-primary-400">Admin Geral</p>
                <p className="text-zinc-400 text-[10px]">Admin@123456</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('caixa@retailos.com');
                  setPassword('Caixa@123456');
                }}
                className="p-2 rounded-lg bg-surface-card hover:bg-surface-border text-left border border-surface-border/80 transition"
              >
                <p className="font-semibold text-primary-400">Operador Caixa</p>
                <p className="text-zinc-400 text-[10px]">Caixa@123456</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
