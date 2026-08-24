'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { api } from '../../../lib/api';
import { Lock, Mail, Store, AlertCircle, ArrowRight, User, Building, CheckCircle, Zap, ShieldCheck } from 'lucide-react';

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
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // 1. Processar retorno de Checkout do Stripe
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get('session_id');
      const statusParam = searchParams.get('status');

      if (statusParam === 'success') {
        if (sessionId) {
          api.post('/subscriptions/stripe/confirm-session', { sessionId })
            .then(() => {
              setSuccessMsg('Pagamento confirmado com sucesso! Sua conta foi liberada. Entre com seu e-mail e senha.');
            })
            .catch(() => {
              setSuccessMsg('Pagamento recebido! Você já pode entrar com seu e-mail e senha.');
            });
        } else {
          setSuccessMsg('Pagamento recebido com sucesso! Sua conta está liberada para acesso.');
        }
      } else if (statusParam === 'canceled') {
        setError('O pagamento foi cancelado. Escolha um plano para concluir a ativação da sua conta.');
      }
    }

    // 2. Processar retorno de OAuth via hash fragment (#access_token=ya29...)
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
              const res = await loginWithGoogle({
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
              });
              if (res?.checkoutUrl) {
                window.location.href = res.checkoutUrl;
              } else if (res?.user?.role === 'SUPER_ADMIN') {
                router.push('/super-admin');
              } else if (res?.user?.role === 'CAIXA') {
                router.push('/pos');
              } else {
                router.push('/dashboard');
              }
            } else {
              setError('Não foi possível obter o e-mail da conta Google.');
            }
          })
          .catch((err: any) => {
            setError(err?.response?.data?.message || err?.message || 'Falha ao autenticar token do Google.');
          })
          .finally(() => {
            setGoogleLoading(false);
          });
      }
    }

    // 3. Carregar SDK oficial do Google Identity Services
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
    setSuccessMsg('');
    setLoading(true);

    try {
      const loggedUser = await login({ 
        email: email.trim(), 
        password, 
        tenantSlug: tenantSlug.trim() || undefined 
      });

      if (typeof window !== 'undefined') {
        if (loggedUser?.role === 'SUPER_ADMIN') {
          window.location.href = '/super-admin';
        } else if (loggedUser?.role === 'CAIXA') {
          window.location.href = '/pos';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      console.error('Login submit error:', err);
      setError(err?.response?.data?.message || err?.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        storeName: regStoreName.trim() || undefined,
        planSlug: selectedPlan,
        billingCycle: billingCycle,
      });

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else if (res?.user?.role === 'SUPER_ADMIN') {
        window.location.href = '/super-admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    setSuccessMsg('');
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1047249272379-fake.apps.googleusercontent.com';

    if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setGoogleLoading(true);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const res = await loginWithGoogle({
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              idToken: response.credential,
              tenantSlug: tenantSlug.trim() || undefined,
            });
            if (res?.checkoutUrl) {
              window.location.href = res.checkoutUrl;
            } else if (res?.user?.role === 'SUPER_ADMIN') {
              window.location.href = '/super-admin';
            } else {
              window.location.href = '/dashboard';
            }
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
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        window.location.origin + '/login'
      )}&response_type=token&scope=email%20profile`;
      
      window.location.href = authUrl;
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col justify-center items-center p-4"
      style={{ backgroundColor: '#090A0F', color: '#F1F3F9' }}
    >
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'} relative z-10 transition-all duration-300`}>
        {/* Header com a Logo Oficial RetailSyn */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-surface-card border border-surface-border rounded-3xl mx-auto flex items-center justify-center p-2 shadow-2xl shadow-primary-500/10 mb-3">
            <img src="/logo.jpg" alt="RetailSyn Logo" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">RetailSyn</h1>
          <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mt-1">
            ESTOQUE &nbsp;|&nbsp; VENDA &nbsp;|&nbsp; GESTÃO
          </p>
        </div>

        {/* Alternar Abas (Entrar vs Criar Conta) */}
        <div className="flex p-1 rounded-xl border mb-4" style={{ backgroundColor: '#181B26', borderColor: '#262B3D' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className="flex-1 py-2.5 text-xs font-bold rounded-lg transition"
            style={mode === 'login' ? { backgroundColor: '#C29B27', color: '#000000' } : { backgroundColor: 'transparent', color: '#9CA3AF' }}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className="flex-1 py-2.5 text-xs font-bold rounded-lg transition"
            style={mode === 'register' ? { backgroundColor: '#C29B27', color: '#000000' } : { backgroundColor: 'transparent', color: '#9CA3AF' }}
          >
            Criar Conta (Cadastrar)
          </button>
        </div>

        {/* Card Principal */}
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl border" style={{ backgroundColor: '#12141D', borderColor: '#262B3D' }}>
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Botão Oficial do Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full mb-6 border font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-3 shadow-md disabled:opacity-50"
            style={{ backgroundColor: '#181B26', color: '#FFFFFF', borderColor: '#262B3D' }}
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-[#C29B27] border-t-transparent rounded-full animate-spin" />
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
                <span className="text-sm" style={{ color: '#FFFFFF' }}>
                  {mode === 'login' ? 'Entrar com o Google' : 'Cadastrar com o Google'}
                </span>
              </>
            )}
          </button>

          {/* Divisor Visual */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-[#262B3D] w-full"></div>
            <span className="px-3 text-[11px] text-zinc-400 uppercase tracking-widest font-semibold absolute" style={{ backgroundColor: '#12141D', color: '#9CA3AF' }}>
              ou com e-mail
            </span>
          </div>

          {/* FORMULÁRIO DE LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5" style={{ color: '#D1D5DB' }}>
                  Empresa (Código / Slug)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    placeholder="Identificador da loja (opcional)"
                    className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition"
                    style={{ backgroundColor: '#181B26', color: '#FFFFFF', borderColor: '#262B3D' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5" style={{ color: '#D1D5DB' }}>
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition"
                    style={{ backgroundColor: '#181B26', color: '#FFFFFF', borderColor: '#262B3D' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5" style={{ color: '#D1D5DB' }}>
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition"
                    style={{ backgroundColor: '#181B26', color: '#FFFFFF', borderColor: '#262B3D' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                style={{ backgroundColor: '#C29B27', color: '#000000', fontWeight: 'bold' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span style={{ color: '#000000', fontWeight: 'bold' }}>Entrar</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORMULÁRIO DE CADASTRO */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* SELEÇÃO DO PLANO E CICLO DE COBRANÇA */}
              <div className="pt-4 border-t border-surface-border space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-primary-400" />
                    <span>Selecione o Plano da Sua Empresa</span>
                  </label>

                  {/* Alternador Mensal / Anual */}
                  <div className="bg-surface-card p-1 rounded-lg border border-surface-border flex gap-1">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('MONTHLY')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded transition ${
                        billingCycle === 'MONTHLY' ? 'bg-primary-500 text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('YEARLY')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded transition flex items-center gap-1 ${
                        billingCycle === 'YEARLY' ? 'bg-primary-500 text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Anual</span>
                      <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-400 rounded font-black">-20%</span>
                    </button>
                  </div>
                </div>

                {/* Grid dos Cards de Seleção de Plano */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Plano Starter */}
                  <div
                    onClick={() => setSelectedPlan('starter')}
                    className={`cursor-pointer p-4 rounded-xl border transition flex flex-col justify-between ${
                      selectedPlan === 'starter'
                        ? 'bg-primary-500/10 border-primary-500 shadow-md shadow-primary-500/10'
                        : 'bg-surface-card border-surface-border hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">Starter</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'starter' ? 'border-primary-400 bg-primary-500' : 'border-zinc-600'
                        }`}>
                          {selectedPlan === 'starter' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mb-2">Ideal para 1 loja de conveniência ou minimercado.</p>
                      <ul className="text-[11px] text-zinc-300 space-y-1 mb-3">
                        <li>• Até 1 Loja</li>
                        <li>• Até 5 Usuários</li>
                        <li>• Até 5000 Produtos</li>
                      </ul>
                    </div>
                    <div className="text-emerald-400 font-mono font-black text-sm pt-2 border-t border-surface-border">
                      {billingCycle === 'YEARLY' ? 'R$ 1.499,99 /ano' : 'R$ 159,99 /mês'}
                    </div>
                  </div>

                  {/* Plano Pro */}
                  <div
                    onClick={() => setSelectedPlan('pro')}
                    className={`cursor-pointer p-4 rounded-xl border transition relative flex flex-col justify-between ${
                      selectedPlan === 'pro'
                        ? 'bg-primary-500/10 border-primary-500 shadow-md shadow-primary-500/10'
                        : 'bg-surface-card border-surface-border hover:border-zinc-700'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-primary-500 text-black font-black text-[9px] uppercase tracking-wider shadow">
                      Mais Popular
                    </span>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">Pro</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'pro' ? 'border-primary-400 bg-primary-500' : 'border-zinc-600'
                        }`}>
                          {selectedPlan === 'pro' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mb-2">Para redes de até 3 lojas com módulo fiscal.</p>
                      <ul className="text-[11px] text-zinc-300 space-y-1 mb-3">
                        <li>• Até 3 Lojas</li>
                        <li>• Até 30 Usuários</li>
                        <li>• Até 10000 Produtos</li>
                      </ul>
                    </div>
                    <div className="text-emerald-400 font-mono font-black text-sm pt-2 border-t border-surface-border">
                      {billingCycle === 'YEARLY' ? 'R$ 1.999,99 /ano' : 'R$ 249,99 /mês'}
                    </div>
                  </div>

                  {/* Plano Interprise */}
                  <div
                    onClick={() => setSelectedPlan('enterprise')}
                    className={`cursor-pointer p-4 rounded-xl border transition flex flex-col justify-between ${
                      selectedPlan === 'enterprise'
                        ? 'bg-primary-500/10 border-primary-500 shadow-md shadow-primary-500/10'
                        : 'bg-surface-card border-surface-border hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">Interprise</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'enterprise' ? 'border-primary-400 bg-primary-500' : 'border-zinc-600'
                        }`}>
                          {selectedPlan === 'enterprise' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mb-2">Ideal para grandes redes, lojas e usuários ilimitados.</p>
                      <ul className="text-[11px] text-zinc-300 space-y-1 mb-3">
                        <li>• Até 10 Lojas</li>
                        <li>• Até 100 Usuários</li>
                        <li>• Produtos Ilimitados</li>
                      </ul>
                    </div>
                    <div className="text-emerald-400 font-mono font-black text-sm pt-2 border-t border-surface-border">
                      {billingCycle === 'YEARLY' ? 'R$ 3.999,99 /ano' : 'R$ 499,99 /mês'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pagamento 100% seguro via <strong>Stripe Checkout</strong></span>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 bg-primary-500 hover:bg-primary-400 text-black font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Criar Conta e Ir para Pagamento</span>
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
