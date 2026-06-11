/**
 * Spec для app/(protected)/progress/page.tsx (#150) — история сессий,
 * метрики SUDS/VOC, геймификация, достижения.
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

// EmotionTimeline — canvas-компонент, рендерим маркером
jest.mock('@/components/ui/EmotionTimeline', () => ({
  EmotionTimeline: ({ points }: { points: unknown[] }) => (
    <div data-testid="emotion-timeline" data-points={points.length} />
  ),
}));

import ProgressPage from '@/app/(protected)/progress/page';

const validAnalytics = {
  totalSessions: 8,
  completed: 6,
  completionRate: 0.75,
  avgSudsReduction: 3.4,
  avgVocGain: 1.8,
  avgDurationSec: 1500,
  sessions: [
    {
      id: 's1',
      startedAt: '2026-06-01T10:00:00Z',
      durationSec: 1800,
      sudsBaseline: 8,
      sudsFinal: 4,
      vocBaseline: 2,
      vocFinal: 5,
    },
    {
      id: 's2',
      startedAt: '2026-06-05T10:00:00Z',
      durationSec: 1200,
      sudsBaseline: 6,
      sudsFinal: 2,
      vocBaseline: 3,
      vocFinal: 6,
    },
  ],
};

const validProgress = {
  xp: 300,
  level: 2,
  currentStreak: 4,
  longestStreak: 7,
  xpToNextLevel: 200,
  achievements: [
    {
      key: 'first',
      title: 'Первая сессия',
      description: 'Завершите первую сессию',
      icon: '🏅',
      unlockedAt: '2026-06-01T11:00:00Z',
    },
  ],
  locked: [],
};

beforeEach(() => {
  analyticsMock.mockReset();
  progressMock.mockReset();
});

describe('ProgressPage (#150)', () => {
  it('loading state (role=status) пока данные грузятся', () => {
    analyticsMock.mockReturnValue(new Promise(() => {}));
    progressMock.mockReturnValue(new Promise(() => {}));
    render(<ProgressPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/Загрузка/);
  });

  it('ошибка API → role=alert с сообщением', async () => {
    analyticsMock.mockRejectedValueOnce(new Error('Сервер недоступен'));
    progressMock.mockRejectedValueOnce(new Error('Сервер недоступен'));
    render(<ProgressPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер недоступен');
  });

  it('не-Error → дефолтное сообщение', async () => {
    analyticsMock.mockRejectedValueOnce('weird');
    progressMock.mockRejectedValueOnce('weird');
    render(<ProgressPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Не удалось загрузить данные/);
  });

  it('totalSessions=0 → empty state со ссылкой на /session', async () => {
    analyticsMock.mockResolvedValueOnce({ ...validAnalytics, totalSessions: 0, sessions: [] });
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    expect(await screen.findByText(/Данных пока нет/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /начать сессию/i })).toHaveAttribute(
      'href',
      '/session',
    );
  });

  it('геймификация: уровень, XP, до следующего уровня, streak', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    expect(await screen.findByText('Уровень 2')).toBeInTheDocument();
    expect(screen.getByText(/300 XP · до следующего уровня: 200 XP/)).toBeInTheDocument();
    expect(screen.getByText(/4 дней/)).toBeInTheDocument();
  });

  it('метрики: всего/завершено с процентом/среднее SUDS↓/средний VOC↑', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    expect(await screen.findByText('8')).toBeInTheDocument();
    expect(screen.getByText('6 (75%)')).toBeInTheDocument();
    expect(screen.getByText('3.4')).toBeInTheDocument();
    expect(screen.getByText('1.8')).toBeInTheDocument();
  });

  it('SUDS timeline: рендерится при >1 точки, по 2 точки на сессию', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    const timeline = await screen.findByTestId('emotion-timeline');
    // 2 сессии × (baseline + final) = 4 точки
    expect(timeline).toHaveAttribute('data-points', '4');
  });

  it('сессии без sudsBaseline/startedAt не попадают в timeline', async () => {
    analyticsMock.mockResolvedValueOnce({
      ...validAnalytics,
      sessions: [
        validAnalytics.sessions[0],
        { ...validAnalytics.sessions[1], sudsBaseline: null },
        {
          id: 's3',
          startedAt: null,
          durationSec: 60,
          sudsBaseline: 5,
          sudsFinal: 3,
          vocBaseline: null,
          vocFinal: null,
        },
      ],
    });
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    const timeline = await screen.findByTestId('emotion-timeline');
    // Только s1 валидна: baseline + final = 2 точки
    expect(timeline).toHaveAttribute('data-points', '2');
  });

  it('список сессий: дата, минуты, SUDS до → после, VOC', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    expect(await screen.findByText('30 мин')).toBeInTheDocument();
    expect(screen.getByText(/SUDS: 8 →/)).toBeInTheDocument();
    expect(screen.getByText(/SUDS: 6 →/)).toBeInTheDocument();
    // VOC финальные значения
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('достижения: разблокированные показаны с иконкой и описанием в title', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce(validProgress);
    render(<ProgressPage />);

    expect(await screen.findByText('Первая сессия')).toBeInTheDocument();
    expect(screen.getByTitle('Завершите первую сессию')).toBeInTheDocument();
  });

  it('без достижений секция не рендерится', async () => {
    analyticsMock.mockResolvedValueOnce(validAnalytics);
    progressMock.mockResolvedValueOnce({ ...validProgress, achievements: [] });
    render(<ProgressPage />);

    await screen.findByText('Уровень 2');
    expect(screen.queryByText('Достижения')).toBeNull();
  });
});
