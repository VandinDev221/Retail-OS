'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { Lock, Mail, Store, AlertCircle, ArrowRight, User, Building } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Formulário Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');

  // Formulário Registro
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStoreName, setRegStoreName] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Processar retorno de OAuth via hash fragment (#access_token=ya29...)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        setGoogleLoading(true);
        window.history.replaceState(null, '', window.location.pathname);

        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then(async (userInfo) => {
            if (userInfo.email) {
              await loginWithGoogle({
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
              });
              router.push('/');
            } else {
              setError('Não foi possível obter o e-mail da conta Google.');
            }
          })
          .catch((err) => {
            setError('Falha ao autenticar token do Google.');
          })
          .finally(() => {
            setGoogleLoading(false);
          });
      }
    }

    // 2. Carregar SDK oficial do Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [loginWithGoogle, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ 
        email: email.trim(), 
        password, 
        tenantSlug: tenantSlug.trim() || undefined 
      });
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        storeName: regStoreName.trim() || undefined,
      });
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1047249272379-fake.apps.googleusercontent.com';

    if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setGoogleLoading(true);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            await loginWithGoogle({
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              idToken: response.credential,
              tenantSlug: tenantSlug.trim() || undefined,
            });
            router.push('/');
          } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao autenticar com a conta Google.');
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
            window.location.origin + '/login'
          )}&response_type=token&scope=email%20profile`;
          
          window.location.href = authUrl;
        }
      });
    } else {
      // Redirecionar diretamente para o fluxo de OAuth do Google se client_id estiver no redirect
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        window.location.origin + '/login'
      )}&response_type=token&scope=email%20profile`;
      
      window.location.href = authUrl;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/login-logo.png"
            alt="Stockfy - PDV • Estoque • Conveniência"
            className="h-16 md:h-20 mx-auto object-contain filter drop-shadow-2xl"
          />
        </div>

        {/* Alternar Abas (Entrar vs Criar Conta) */}
        <div className="flex bg-surface-card p-1 rounded-xl border border-surface-border mb-4">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mode === 'login' ? 'bg-primary-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mode === 'register' ? 'bg-primary-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Criar Conta (Cadastrar)
          </button>
        </div>

        {/* Card Principal */}
        <div className="bg-surface border border-surface-border rounded-2xl p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botão Oficial do Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full mb-6 bg-surface-card hover:bg-surface-border border border-surface-border text-zinc-100 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-3 shadow-md disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.27v3.15C3.25 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4.01-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4.01 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span className="text-sm">
                  {mode === 'login' ? 'Entrar com o Google' : 'Cadastrar com o Google'}
                </span>
              </>
            )}
          </button>

          {/* Divisor Visual */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-surface-border w-full"></div>
            <span className="bg-surface px-3 text-[11px] text-zinc-500 uppercase tracking-widest font-semibold absolute">
              ou com e-mail
            </span>
          </div>

          {/* FORMULÁRIO DE LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Empresa (Código / Slug)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    placeholder="Identificador da loja (opcional)"
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
                    placeholder="seu.email@empresa.com"
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
                disabled={loading || googleLoading}
                className="w-full mt-2 bg-primary-500 hover:bg-primary-400 text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORMULÁRIO DE CADASTRO */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Seu Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Nome da Sua Loja / Empresa
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    placeholder="Ex: Conveniência Central"
                    className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Crie sua Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 bg-primary-500 hover:bg-primary-400 text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Criar Minha Conta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
