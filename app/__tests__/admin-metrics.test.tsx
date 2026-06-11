/**
 * Spec для app/(protected)/admin/metrics/page.tsx (#150) — детальные метрики.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Стабильные ссылки — эффект зависит от [hasRole, router, range].
const pushMock = jest.fn();
const stableRouter = { push: pushMock };
jest.mock('next/navigation', () => ({
  useRouter: () => stableRouter,
}));

const metricsMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { getMetrics: (...args: unknown[]) => metricsMock(...args) },
}));

let roles: string[] = ['ADMIN'];
const stableHasRole = (r: string) => roles.includes(r);
const stableAuth = { hasRole: stableHasRole };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import AdminMetricsPage from '@/app/(protected)/admin/metrics/page';

const validMetrics = {
  totalSessions: 250,
  completionRate: 82.5,
  avgSessionDuration: 27.4,
  avgSudsReduction: 3.2,
  safetyEventsCount: 5,
  sessionStatusBreakdown: { completed: 200, aborted: 30, paused: 20 },
  topPatterns: [
    { pattern: 'horizontal', count: 120 },
    { pattern: 'infinity', count: 80 },
  ],
};

beforeEach(() => {
  pushMock.mockReset();
  metricsMock.mockReset();
  roles = ['ADMIN'];
});

describe('AdminMetricsPage (#150)', () => {
  it('не-ADMIN → redirect, API не вызывается', () => {
    roles = ['PATIENT'];
    render(<AdminMetricsPage />);

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(metricsMock).not.toHaveBeenCalled();
  });

  it('summary-карты: форматирование процентов, минут, SUDS', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminMetricsPage />);

    expect(await screen.findByText('250')).toBeInTheDocument();
    expect(screen.getByText('82.5%')).toBeInTheDocument();
    expect(screen.getByText('27 min')).toBeInTheDocument(); // toFixed(0)
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('null-метрики → «--»', async () => {
    metricsMock.mockResolvedValueOnce({
      ...validMetrics,
      completionRate: null,
      avgSessionDuration: null,
      avgSudsReduction: null,
    });
    render(<AdminMetricsPage />);

    await screen.findByText('250');
    expect(screen.getAllByText('--')).toHaveLength(3);
  });

  it('breakdown: проценты от суммы (200/250 = 80.0%)', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminMetricsPage />);

    expect(await screen.findByText(/200 \(80\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/30 \(12\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/20 \(8\.0%\)/)).toBeInTheDocument();
  });

  it('нулевой breakdown → «No data available»', async () => {
    metricsMock.mockResolvedValueOnce({
      ...validMetrics,
      sessionStatusBreakdown: { completed: 0, aborted: 0, paused: 0 },
      topPatterns: [],
    });
    render(<AdminMetricsPage />);

    await screen.findByText('250');
    expect(screen.getAllByText(/No data available/)).toHaveLength(2);
  });

  it('top patterns: ранжирование и счётчики', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminMetricsPage />);

    expect(await screen.findByText('horizontal')).toBeInTheDocument();
    expect(screen.getByText('120 sessions')).toBeInTheDocument();
    expect(screen.getByText('infinity')).toBeInTheDocument();
  });

  it('смена time range перезапрашивает метрики', async () => {
    metricsMock.mockResolvedValue(validMetrics);
    const user = userEvent.setup();
    render(<AdminMetricsPage />);
    await screen.findByText('250');
    expect(metricsMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /7 days/i }));

    await screen.findByText('250');
    expect(metricsMock).toHaveBeenCalledTimes(2);
  });

  it('ошибка → сообщение', async () => {
    metricsMock.mockRejectedValueOnce(new Error('Metrics service down'));
    render(<AdminMetricsPage />);

    expect(await screen.findByText('Metrics service down')).toBeInTheDocument();
  });
});
