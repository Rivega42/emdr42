'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User, UserRole } from '@/lib/types';

/**
 * MFA-required состояние: backend выдаёт mfaToken (5 мин TTL), фронт сохраняет
 * и шлёт его + TOTP в /mfa/challenge. Это выбрасывается из login() как
 * специальный класс ошибки — UI ловит и переключается на MFA-форму.
 */
export class MfaRequiredError extends Error {
  public readonly mfaToken: string;
  constructor(mfaToken: string) {
    super('MFA required');
    this.name = 'MfaRequiredError';
    this.mfaToken = mfaToken;
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      api.setToken(token);
      try {
        const profile = await api.getProfile();
        setUser(profile);
      } catch {
        localStorage.removeItem('token');
        api.setToken(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    // MFA-ветка — фронт показывает форму challenge.
    if ('mfaRequired' in res) {
      throw new MfaRequiredError(res.mfaToken);
    }
    localStorage.setItem('token', res.accessToken);
    api.setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const completeMfa = useCallback(async (mfaToken: string, code: string) => {
    const res = await api.mfaChallenge(mfaToken, code);
    localStorage.setItem('token', res.accessToken);
    api.setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    localStorage.setItem('token', res.accessToken);
    api.setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    api.setToken(null);
  }, []);

  const hasRole = useCallback(
    (role: UserRole) => user?.role === role,
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        completeMfa,
        logout,
        register,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
