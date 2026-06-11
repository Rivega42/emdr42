/**
 * Spec для app/(protected)/patients/[id]/page.tsx (#150) — карточка пациента
 * у терапевта. Ключевое: role-gate, расчёт avg SUDS reduction, навигация к сессии.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: 'p1' }),
}));

// framer-motion → обычные div, анимации не тестируем
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...domProps } = rest;
      return <div {...domProps}>{children}</div>;
    },
  },
}));

const sessionsMock = jest.fn();
const patientsMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getPatientSessions: (...args: unknown[]) => sessionsMock(...args),
    getMyPatients: (...args: unknown[]) => patientsMock(...args),
  },
}));

let roles: string[] = ['THERAPIST'];
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hasRole: (r: string) => roles.includes(r) }),
}));

import PatientDetailPage from '@/app/(protected)/patients/[id]/page';

const patient = {
  id: 'p1',
  name: 'Анна Смирнова',
  email: 'anna@b.com',
  createdAt: '2026-01-15T00:00:00Z',
};

const sessions = [
  {
    id: 's1',
    startedAt: '2026-06-01T10:00:00Z',
    durationMinutes: 30,
    blsPattern: 'horizontal',
    sudsStart: 8,
    sudsEnd: 4,
    status: 'completed',
  },
  {
    id: 's2',
    startedAt: '2026-06-05T10:00:00Z',
    durationMinutes: 25,
    blsPattern: 'infinity',
    sudsStart: 6,
    sudsEnd: 2,
    status: 'completed',
  },
  {
    id: 's3',
    startedAt: '2026-06-08T10:00:00Z',
    durationMinutes: null,
    blsPattern: 'vertical',
    sudsStart: null,
    sudsEnd: null,
    status: 'aborted',
  },
];

beforeEach(() => {
  pushMock.mockReset();
  sessionsMock.mockReset();
  patientsMock.mockReset();
  roles = ['THERAPIST'];
});

describe('PatientDetailPage (#150)', () => {
  it('role-gate: не-терапевт видит отказ, API не вызывается', () => {
    roles = ['PATIENT'];
    render(<PatientDetailPage />);

    expect(screen.getByText(/Access restricted to therapists/)).toBeInTheDocument();
    expect(sessionsMock).not.toHaveBeenCalled();
  });

  it('шапка: имя, email, число сессий, дата регистрации', async () => {
    sessionsMock.mockResolvedValueOnce(sessions);
    patientsMock.mockResolvedValueOnce([patient]);
    render(<PatientDetailPage />);

    expect(await screen.findByText('Анна Смирнова')).toBeInTheDocument();
    expect(screen.getByText('anna@b.com')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // sessions.length
  });

  it('avg SUDS reduction: среднее по completed-сессиям', async () => {
    sessionsMock.mockResolvedValueOnce(sessions);
    patientsMock.mockResolvedValueOnce([patient]);
    render(<PatientDetailPage />);

    // (8-4 + 6-2) / 2 completed = 4.0; aborted-сессия не участвует
    expect(await screen.findByText('4.0')).toBeInTheDocument();
  });

  it('нет completed-сессий → «—» вместо среднего', async () => {
    sessionsMock.mockResolvedValueOnce([sessions[2]]); // только aborted
    patientsMock.mockResolvedValueOnce([patient]);
    render(<PatientDetailPage />);

    await screen.findByText('Анна Смирнова');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('пациент не найден в списке → fallback «Patient» без креша', async () => {
    sessionsMock.mockResolvedValueOnce(sessions);
    patientsMock.mockResolvedValueOnce([]); // нет пациента с id=p1
    render(<PatientDetailPage />);

    expect(await screen.findByText('Patient')).toBeInTheDocument();
  });

  it('история: SUDS до → после, паттерн, длительность, статусы', async () => {
    sessionsMock.mockResolvedValueOnce(sessions);
    patientsMock.mockResolvedValueOnce([patient]);
    render(<PatientDetailPage />);

    expect(await screen.findByText('8 → 4')).toBeInTheDocument();
    expect(screen.getByText('6 → 2')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('horizontal')).toBeInTheDocument();
    expect(screen.getAllByText('completed')).toHaveLength(2);
    expect(screen.getByText('aborted')).toBeInTheDocument();
  });

  it('пустая история → «No sessions recorded yet»', async () => {
    sessionsMock.mockResolvedValueOnce([]);
    patientsMock.mockResolvedValueOnce([patient]);
    render(<PatientDetailPage />);

    expect(await screen.findByText(/No sessions recorded yet/)).toBeInTheDocument();
  });

  it('клик по сессии → push на /patients/p1/sessions/[sessionId]', async () => {
    sessionsMock.mockResolvedValueOnce(sessions);
    patientsMock.mockResolvedValueOnce([patient]);
    const user = userEvent.setup();
    render(<PatientDetailPage />);

    await user.click(await screen.findByText('8 → 4'));

    expect(pushMock).toHaveBeenCalledWith('/patients/p1/sessions/s1');
  });

  it('ошибка API → сообщение об ошибке', async () => {
    sessionsMock.mockRejectedValueOnce(new Error('Сервер недоступен'));
    patientsMock.mockRejectedValueOnce(new Error('Сервер недоступен'));
    render(<PatientDetailPage />);

    expect(await screen.findByText('Сервер недоступен')).toBeInTheDocument();
  });

  it('ссылка назад на /patients', async () => {
    sessionsMock.mockResolvedValueOnce(sessions);
    patientsMock.mockResolvedValueOnce([patient]);
    render(<PatientDetailPage />);

    expect(await screen.findByRole('link', { name: /back to patients/i })).toHaveAttribute(
      'href',
      '/patients',
    );
  });
});
