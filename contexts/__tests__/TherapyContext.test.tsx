/**
 * Spec для contexts/TherapyContext (#150) — управление EMDR-сессиями
 * с persistence в localStorage (#235 backward compat для legacy формата).
 */
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { TherapyProvider, useTherapy } from '@/contexts/TherapyContext';

const STORAGE_KEY = 'therapy_sessions';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TherapyProvider>{children}</TherapyProvider>
);

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

describe('TherapyContext (#150)', () => {
  describe('useTherapy без провайдера', () => {
    it('бросает Error', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useTherapy())).toThrow(
        /useTherapy must be used within a TherapyProvider/,
      );
      (console.error as jest.Mock).mockRestore();
    });
  });

  describe('initial state', () => {
    it('пустые sessions, currentSession=null, isSessionActive=false', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      expect(result.current.currentSession).toBeNull();
      expect(result.current.sessions).toEqual([]);
      expect(result.current.isSessionActive).toBe(false);
    });
  });

  describe('startSession', () => {
    it('создаёт currentSession и активирует флаг', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('horizontal'));

      expect(result.current.currentSession).not.toBeNull();
      expect(result.current.currentSession?.pattern).toBe('horizontal');
      expect(result.current.currentSession?.duration).toBe(0);
      expect(result.current.isSessionActive).toBe(true);
    });

    it('id — timestamp-строка', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('square'));
      expect(result.current.currentSession?.id).toMatch(/^\d+$/);
    });
  });

  describe('endSession', () => {
    it('сохраняет сессию с вычисленной duration и сбрасывает current', () => {
      // Fake timers — single source of truth для Date.now() И new Date()
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-10T10:00:00Z'));

      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('horizontal'));
      jest.advanceTimersByTime(30_000); // 30 сек
      act(() => result.current.endSession());

      expect(result.current.currentSession).toBeNull();
      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].duration).toBe(30);

      jest.useRealTimers();
    });

    it('endSession без активной сессии — no-op', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.endSession());
      expect(result.current.sessions).toEqual([]);
    });

    it('сохраняет сессии в localStorage в формате v1', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('horizontal'));
      act(() => result.current.endSession());

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(1);
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0].pattern).toBe('horizontal');
    });
  });

  describe('pause / resume', () => {
    it('pauseSession делает isSessionActive=false', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('h'));
      act(() => result.current.pauseSession());
      expect(result.current.isSessionActive).toBe(false);
    });

    it('resumeSession делает isSessionActive=true', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('h'));
      act(() => result.current.pauseSession());
      act(() => result.current.resumeSession());
      expect(result.current.isSessionActive).toBe(true);
    });
  });

  describe('getSessions / getSessionById', () => {
    it('getSessions возвращает все сессии', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('a'));
      act(() => result.current.endSession());
      act(() => result.current.startSession('b'));
      act(() => result.current.endSession());

      expect(result.current.getSessions()).toHaveLength(2);
    });

    it('getSessionById возвращает сессию по id', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      act(() => result.current.startSession('horizontal'));
      const id = result.current.currentSession!.id;
      act(() => result.current.endSession());

      expect(result.current.getSessionById(id)?.pattern).toBe('horizontal');
    });

    it('getSessionById возвращает undefined для неизвестного id', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      expect(result.current.getSessionById('no-such')).toBeUndefined();
    });
  });

  describe('restore from localStorage', () => {
    it('v1 формат: восстанавливает массив sessions', () => {
      const session = {
        id: '123',
        date: new Date('2026-06-10').toISOString(),
        duration: 60,
        pattern: 'horizontal',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions: [session] }));

      const { result } = renderHook(() => useTherapy(), { wrapper });
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].pattern).toBe('horizontal');
      expect(result.current.sessions[0].duration).toBe(60);
    });

    it('legacy формат (v0 — голый массив): мигрирует и сохраняет как v1 (#235)', () => {
      const legacy = [
        {
          id: '1',
          date: new Date('2025-01-01').toISOString(),
          duration: 30,
          pattern: 'h',
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

      const { result } = renderHook(() => useTherapy(), { wrapper });

      expect(result.current.sessions).toHaveLength(1);
      // Должно быть переписано в v1 после миграции
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(raw.version).toBe(1);
      expect(raw.sessions).toHaveLength(1);
    });

    it('corrupt JSON → чистит localStorage и стартует с пустого', () => {
      localStorage.setItem(STORAGE_KEY, '{not json');

      const { result } = renderHook(() => useTherapy(), { wrapper });
      expect(result.current.sessions).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('невалидная схема (отсутствует pattern) → чистит localStorage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          sessions: [{ id: '1', date: '2026-01-01', duration: 0 }], // нет pattern
        }),
      );

      const { result } = renderHook(() => useTherapy(), { wrapper });
      expect(result.current.sessions).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('пустой localStorage → пустой sessions', () => {
      const { result } = renderHook(() => useTherapy(), { wrapper });
      expect(result.current.sessions).toEqual([]);
    });
  });
});
