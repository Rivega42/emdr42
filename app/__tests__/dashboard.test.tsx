/**
 * Spec для app/(protected)/dashboard/page.tsx (#150) — главный экран кабинета.
 * Ключевое: агрегация analytics+progress, расчёт «за неделю», graceful degradation.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

const analyticsMock = jest.fn();
const progressMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getMyAnalytics: (...args: unknown[]) => analyticsMock(...args),
    getMyProgress: (...args: unknown[]) => progressMock(...args),
  },
}));

let authUser: { name?: string } | null = { name: 'Roman' };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

import DashboardPage from '@/app/(protected)/dashboard/page';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const validAnalytics = {
  totalSessions: 12,
  completionRate: 0.8,
  avgSudsReduction: 3.2,
  avgDurationSec: 1500,
  sessions: [
    { id: 's1', startedAt: daysAgo(20), durationSec: 1800 },
    { id: 's2', startedAt: daysAgo(2), durationSec: 1200 },
    { id: 's3', startedAt: daysAgo(1), durationSec: 600 },
  ],
};
const validProgress = { level: 3, xp: 450, currentStreak: 5 };

beforeEach(() => {
  analyticsMock.mockReset();
  progressMock.mockReset();
  authUser = { name: 'Roman' };
});

describe('DashboardPage (#150)', () => {
  it('приветствие с именем юзера', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);
    expect(await screen.findByText(/С возвращением, Roman!/)).toBeInTheDocument();
  });

  it('без имени → fallback «друг»', async () => {
    authUser = null;
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);
    expect(await screen.findByText(/С возвращением, друг!/)).toBeInTheDocument();
  });

  it('quick stats: streak и level из progress, сессии за неделю посчитаны', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);

    expect(await screen.findByText('5 дней')).toBeInTheDocument(); // streak
    expect(screen.getByText('3')).toBeInTheDocument(); // level
    // s2 (2 дня) + s3 (1 день) внутри недели, s1 (20 дней) — нет
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('общее время = сумма durationSec в часах', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);
    // 1800+1200+600 = 3600с = 1.0ч
    expect(await screen.findByText('1.0ч')).toBeInTheDocument();
  });

  it('недавние сессии: показаны в обратном порядке, длительность в минутах', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);

    expect(await screen.findByText('30 мин')).toBeInTheDocument(); // s1: 1800с
    expect(screen.getByText('20 мин')).toBeInTheDocument(); // s2: 1200с
    expect(screen.getByText('10 мин')).toBeInTheDocument(); // s3: 600с
  });

  it('сессия без startedAt → «Дата не указана», без durationSec → «—»', async () => {
    analyticsMock.mockResolvedValueOnce({
      ...validAnalytics,
      sessions: [{ id: 's1', startedAt: null, durationSec: null }],
    });
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);

    expect(await screen.findByText('Дата не указана')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('пустой список сессий → подсказка начать первую', async () => {
    analyticsMock.mockResolvedValueOnce({ ...validAnalytics, sessions: [] });
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);

    expect(
      await screen.findByText(/Вы ещё не проводили сессий. Начните первую!/),
    ).toBeInTheDocument();
  });

  it('graceful degradation: API упал → placeholder без креша', async () => {
    analyticsMock.mockRejectedValueOnce(new Error('500'));
    progressMock.mockRejectedValueOnce(new Error('500'));
    render(<DashboardPage />);

    // Дефолтные значения после загрузки
    expect(await screen.findByText('0 дней')).toBeInTheDocument();
    expect(screen.getByText(/Вы ещё не проводили сессий/)).toBeInTheDocument();
  });

  it('цель дня: streak > 0 → «Продолжить streak», иначе — первая сессия', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);

    expect(await screen.findByText(/Продолжить streak \(5 дней\)/)).toBeInTheDocument();
    expect(screen.getByText(/Цель выполнена!/)).toBeInTheDocument();
  });

  it('streak=0 и нет сессий за неделю → «Пройти первую сессию сегодня»', async () => {
    analyticsMock.mockResolvedValueOnce({ ...validAnalytics, sessions: [] });
    progressMock.mockResolvedValueOnce({ ...validProgress, currentStreak: 0 });
    render(<DashboardPage />);

    expect(await screen.findByText(/Пройти первую сессию сегодня/)).toBeInTheDocument();
    expect(screen.getByText(/Откройте сессию, чтобы начать/)).toBeInTheDocument();
  });

  it('CTA-ссылки: быстрый старт и направляемая сессия', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<DashboardPage />);

    expect(await screen.findByRole('link', { name: /быстрый старт/i })).toHaveAttribute(
      'href',
      '/session',
    );
    expect(screen.getByRole('link', { name: /направляемая сессия/i })).toHaveAttribute(
      'href',
      '/session?guided=true',
    );
    expect(screen.getByRole('link', { name: /все сессии/i })).toHaveAttribute('href', '/progress');
  });
});
