/**
 * Spec для app/(protected)/admin/page.tsx (#150) — панель администратора.
 * Ключевое: ADMIN-gate с redirect, метрики платформы, safety alerts.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const metricsMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { getMetrics: (...args: unknown[]) => metricsMock(...args) },
}));

let roles: string[] = ['ADMIN'];
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hasRole: (r: string) => roles.includes(r) }),
}));

import AdminDashboard from '@/app/(protected)/admin/page';

const validMetrics = {
  totalUsers: 142,
  activeSessionsNow: 3,
  sessionsToday: 17,
  safetyAlertsCount: 2,
  avgSudsReduction: 3.7,
  recentSafetyAlerts: [
    {
      id: 'a1',
      type: 'stress_critical',
      userName: 'Анна С.',
      message: 'SUDS превысил порог во время фазы 4',
      createdAt: '2026-06-11T10:00:00Z',
    },
    {
      id: 'a2',
      type: 'manual_stop',
      userName: 'Борис К.',
      message: 'Пользователь остановил сессию вручную',
      createdAt: '2026-06-11T09:00:00Z',
    },
  ],
};

beforeEach(() => {
  pushMock.mockReset();
  metricsMock.mockReset();
  roles = ['ADMIN'];
});

describe('AdminDashboard (#150)', () => {
  it('не-ADMIN → redirect на /dashboard, метрики не запрашиваются', () => {
    roles = ['THERAPIST'];
    render(<AdminDashboard />);

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(metricsMock).not.toHaveBeenCalled();
  });

  it('loading → role=status спиннер', () => {
    metricsMock.mockReturnValue(new Promise(() => {}));
    render(<AdminDashboard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('ошибка → role=alert', async () => {
    metricsMock.mockRejectedValueOnce(new Error('Метрики недоступны'));
    render(<AdminDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Метрики недоступны');
  });

  it('stat-карты: пользователи, активные сессии, сессии сегодня, alerts', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminDashboard />);

    expect(await screen.findByText('142')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('среднее снижение SUDS с toFixed(1)', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminDashboard />);

    expect(await screen.findByText('3.7')).toBeInTheDocument();
  });

  it('null avgSudsReduction → «—»', async () => {
    metricsMock.mockResolvedValueOnce({ ...validMetrics, avgSudsReduction: null });
    render(<AdminDashboard />);

    await screen.findByText('142');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('состояние системы: операционные сервисы и planned LiveKit', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminDashboard />);

    await screen.findByText('142');
    expect(screen.getAllByText('работает')).toHaveLength(3); // API, DB, Redis
    expect(screen.getByText('планируется')).toBeInTheDocument(); // LiveKit
  });

  it('safety alerts: имя, сообщение, время', async () => {
    metricsMock.mockResolvedValueOnce(validMetrics);
    render(<AdminDashboard />);

    expect(await screen.findByText('Анна С.')).toBeInTheDocument();
    expect(screen.getByText(/SUDS превысил порог/)).toBeInTheDocument();
    expect(screen.getByText('Борис К.')).toBeInTheDocument();
  });

  it('без alerts → «Нет недавних safety alerts»', async () => {
    metricsMock.mockResolvedValueOnce({ ...validMetrics, recentSafetyAlerts: [] });
    render(<AdminDashboard />);

    expect(await screen.findByText(/Нет недавних safety alerts/)).toBeInTheDocument();
  });

  it('alerts ограничены десятью', async () => {
    const manyAlerts = Array.from({ length: 15 }, (_, i) => ({
      id: `a${i}`,
      type: 'panic',
      userName: `User ${i}`,
      message: `Alert ${i}`,
      createdAt: '2026-06-11T10:00:00Z',
    }));
    metricsMock.mockResolvedValueOnce({ ...validMetrics, recentSafetyAlerts: manyAlerts });
    render(<AdminDashboard />);

    await screen.findByText('User 0');
    expect(screen.getByText('User 9')).toBeInTheDocument();
    expect(screen.queryByText('User 10')).toBeNull();
  });
});
