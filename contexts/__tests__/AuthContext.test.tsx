/**
 * Spec для AuthContext (#150) — auth state machine: restore session,
 * login (с MFA-веткой), MFA challenge, register, logout, refresh-token
 * rotation hooks (onTokensUpdated, onSessionExpired).
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth, MfaRequiredError } from '../AuthContext';

// Мок api-клиента — заменяем модуль целиком.
jest.mock('@/lib/api', () => {
  const apiMock = {
    setToken: jest.fn(),
    setRefreshToken: jest.fn(),
    onTokensUpdated: undefined as any,
    onSessionExpired: undefined as any,
    getProfile: jest.fn(),
    login: jest.fn(),
    mfaChallenge: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  };
  return { api: apiMock };
});

import { api } from '@/lib/api';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(AuthProvider, null, children);

const FAKE_USER = {
  id: 'u1',
  email: 'u@example.com',
  name: 'User',
  role: 'PATIENT' as const,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('AuthContext (#150)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // ---- restoreSession ----

  it('loading завершается без токенов в localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(api.getProfile).not.toHaveBeenCalled();
  });

  it('restoreSession: токен в localStorage → grabbит профиль → user заполняется', async () => {
    localStorage.setItem('token', 'a1');
    localStorage.setItem('refreshToken', 'r1');
    api.getProfile.mockResolvedValueOnce(FAKE_USER);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(FAKE_USER);
    expect(result.current.isAuthenticated).toBe(true);
    // ApiClient получил оба токена при restore
    expect(api.setToken).toHaveBeenCalledWith('a1');
    expect(api.setRefreshToken).toHaveBeenCalledWith('r1');
  });

  it('restoreSession: getProfile rejects → токены очищаются, user остаётся null', async () => {
    localStorage.setItem('token', 'a1');
    localStorage.setItem('refreshToken', 'r1');
    api.getProfile.mockRejectedValueOnce(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  // ---- login ----

  it('login успешный → токены сохраняются, user заполнен', async () => {
    api.login.mockResolvedValueOnce({
      accessToken: 'a2',
      refreshToken: 'r2',
      user: FAKE_USER,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.login('u@example.com', 'pwd'));

    expect(result.current.user).toEqual(FAKE_USER);
    expect(localStorage.getItem('token')).toBe('a2');
    expect(localStorage.getItem('refreshToken')).toBe('r2');
  });

  it('login → mfaRequired бросает MfaRequiredError с mfaToken', async () => {
    api.login.mockResolvedValueOnce({
      mfaRequired: true,
      mfaToken: 'mfa-tok-1',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.login('u@example.com', 'pwd')).rejects.toBeInstanceOf(
      MfaRequiredError,
    );
    // На MFA-ветке user не залогинен и токены не сохранены
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('completeMfa: код принят → токены сохранены, user залогинен', async () => {
    api.mfaChallenge.mockResolvedValueOnce({
      accessToken: 'a3',
      refreshToken: 'r3',
      user: FAKE_USER,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.completeMfa('mfa-tok-1', '123456'));

    expect(api.mfaChallenge).toHaveBeenCalledWith('mfa-tok-1', '123456');
    expect(result.current.user).toEqual(FAKE_USER);
    expect(localStorage.getItem('token')).toBe('a3');
  });

  // ---- register ----

  it('register: успех → токены и user', async () => {
    api.register.mockResolvedValueOnce({
      accessToken: 'a4',
      refreshToken: 'r4',
      user: FAKE_USER,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.register('User', 'u@example.com', 'pwd!'));

    expect(api.register).toHaveBeenCalledWith({
      name: 'User',
      email: 'u@example.com',
      password: 'pwd!',
    });
    expect(result.current.user).toEqual(FAKE_USER);
  });

  // ---- logout ----

  it('logout: best-effort server revoke + локальная очистка', async () => {
    api.login.mockResolvedValueOnce({
      accessToken: 'a',
      refreshToken: 'r',
      user: FAKE_USER,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.login('u@example.com', 'pwd'));
    expect(result.current.user).not.toBeNull();

    act(() => result.current.logout());

    expect(api.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  // ---- onTokensUpdated / onSessionExpired hooks ----

  it('onTokensUpdated: ротация в ApiClient синхронизируется в localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // ApiClient вызывает hook после успешной ротации.
    act(() => api.onTokensUpdated?.({ accessToken: 'new-a', refreshToken: 'new-r' }));

    expect(localStorage.getItem('token')).toBe('new-a');
    expect(localStorage.getItem('refreshToken')).toBe('new-r');
  });

  it('onSessionExpired: refresh неудался → user=null, токены очищены', async () => {
    api.login.mockResolvedValueOnce({
      accessToken: 'a',
      refreshToken: 'r',
      user: FAKE_USER,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.login('u@example.com', 'pwd'));
    expect(result.current.user).not.toBeNull();

    // Эмулируем коллапс сессии из ApiClient.
    act(() => api.onSessionExpired?.());

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(localStorage.getItem('token')).toBeNull();
  });

  // ---- hasRole ----

  it('hasRole: возвращает true для совпадающей роли, false иначе', async () => {
    localStorage.setItem('token', 'a');
    api.getProfile.mockResolvedValueOnce({ ...FAKE_USER, role: 'THERAPIST' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    expect(result.current.hasRole('THERAPIST')).toBe(true);
    expect(result.current.hasRole('PATIENT')).toBe(false);
    expect(result.current.hasRole('ADMIN')).toBe(false);
  });

  // ---- useAuth outside provider ----

  it('useAuth вне AuthProvider бросает понятную ошибку', () => {
    // Без wrapper — нет AuthProvider в дереве.
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an AuthProvider/,
    );
  });
});
