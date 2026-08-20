'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  storeId?: string;
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (data: { email: string; password: string; tenantSlug?: string }) => Promise<UserProfile>;
  register: (data: { name: string; email: string; password: string; storeName?: string; planSlug?: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) => Promise<{ checkoutUrl?: string; message?: string; user?: UserProfile }>;
  loginWithGoogle: (data: { email: string; name: string; googleId?: string; idToken?: string; tenantSlug?: string }) => Promise<{ checkoutUrl?: string; message?: string; user?: UserProfile }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('retail_os_token');
    const savedUser = localStorage.getItem('retail_os_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (data: { email: string; password: string; tenantSlug?: string }): Promise<UserProfile> => {
    const res = await api.post('/auth/login', data);
    const { accessToken, refreshToken, user: userData } = res.data;

    setToken(accessToken);
    setUser(userData);

    localStorage.setItem('retail_os_token', accessToken);
    localStorage.setItem('retail_os_refresh_token', refreshToken);
    localStorage.setItem('retail_os_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (data: { name: string; email: string; password: string; storeName?: string; planSlug?: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) => {
    const res = await api.post('/auth/register', data);
    if (res.data.checkoutUrl) {
      return { checkoutUrl: res.data.checkoutUrl, message: res.data.message };
    }
    const { accessToken, refreshToken, user: userData } = res.data;

    setToken(accessToken);
    setUser(userData);

    localStorage.setItem('retail_os_token', accessToken);
    localStorage.setItem('retail_os_refresh_token', refreshToken);
    localStorage.setItem('retail_os_user', JSON.stringify(userData));
    return { user: userData };
  };

  const loginWithGoogle = async (data: { email: string; name: string; googleId?: string; idToken?: string; tenantSlug?: string }) => {
    const res = await api.post('/auth/google', data);
    if (res.data.checkoutUrl) {
      return { checkoutUrl: res.data.checkoutUrl, message: res.data.message };
    }
    const { accessToken, refreshToken, user: userData } = res.data;

    setToken(accessToken);
    setUser(userData);

    localStorage.setItem('retail_os_token', accessToken);
    localStorage.setItem('retail_os_refresh_token', refreshToken);
    localStorage.setItem('retail_os_user', JSON.stringify(userData));
    return { user: userData };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('retail_os_token');
    localStorage.removeItem('retail_os_refresh_token');
    localStorage.removeItem('retail_os_user');
    window.location.href = '/login';
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return user.permissions?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
