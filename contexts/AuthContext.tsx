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

  // Персистит пару токенов (access 15 мин + refresh 7 дней с ротацией).
  const storeTokens = useCallback(
    (tokens: { accessToken: string; refreshToken?: string }) => {
      localStorage.setItem('token', tokens.accessToken);
      api.setToken(tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
        api.setRefreshToken(tokens.refreshToken);
      }
    },
    [],
  );

  const clearTokens = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    api.setToken(null);
    api.setRefreshToken(null);
  }, []);

  useEffect(() => {
    // ApiClient ротирует пару на 401 — синхронизируем в localStorage.
    api.onTokensUpdated = (tokens) => {
      localStorage.setItem('token', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
    };
    api.onSessionExpired = () => {
      clearTokens();
      setUser(null);
    };

    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!token && !refreshToken) {
        setLoading(false);
        return;
      }
      api.setToken(token);
      api.setRefreshToken(refreshToken);
      try {
        const profile = await api.getProfile();
        setUser(profile);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, [clearTokens]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    // MFA-ветка — фронт показывает форму challenge.
    if ('mfaRequired' in res) {
      throw new MfaRequiredError(res.mfaToken);
    }
    storeTokens(res);
    setUser(res.user);
  }, [storeTokens]);

  const completeMfa = useCallback(async (mfaToken: string, code: string) => {
    const res = await api.mfaChallenge(mfaToken, code);
    storeTokens(res);
    setUser(res.user);
  }, [storeTokens]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    storeTokens(res);
    setUser(res.user);
  }, [storeTokens]);

  const logout = useCallback(() => {
    // Серверный revoke refresh token — best-effort, не блокируем UI.
    void api.logout();
    setUser(null);
    clearTokens();
  }, [clearTokens]);

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
