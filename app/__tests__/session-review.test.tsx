/**
 * Spec для app/(protected)/patients/[id]/sessions/[sessionId]/page.tsx (#150) —
 * разбор сессии терапевтом: timeline, SUDS/VOC, emotion track, заметки.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'p1', sessionId: 's1' }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...domProps } = rest;
      return <div {...domProps}>{children}</div>;
    },
  },
}));

const detailMock = jest.fn();
const notesMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getSessionDetail: (...args: unknown[]) => detailMock(...args),
    updateSessionNotes: (...args: unknown[]) => notesMock(...args),
  },
}));

let roles: string[] = ['THERAPIST'];
const stableAuth = { hasRole: (r: string) => roles.includes(r) };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import SessionReviewPage from '@/app/(protected)/patients/[id]/sessions/[sessionId]/page';

const validSession = {
  id: 's1',
  startedAt: '2026-06-01T10:00:00Z',
  durationMinutes: 32,
  blsPattern: 'horizontal',
  status: 'completed',
  sudsStart: 8,
  sudsEnd: 3,
  vocStart: 2,
  vocEnd: 6,
  therapistNotes: 'Старые заметки',
  phases: [{ phase: 'preparation' }, { phase: 'desensitization' }, { phase: 'closure' }],
  timeline: [
    {
      id: 'e1',
      type: 'ai_message',
      timestamp: '2026-06-01T10:01:00Z',
      content: 'Начнём с безопасного места',
    },
    {
      id: 'e2',
      type: 'safety_alert',
      timestamp: '2026-06-01T10:15:00Z',
      content: 'Критический уровень стресса',
    },
  ],
  emotions: [
    { timestamp: '2026-06-01T10:05:00Z', stress: 0.2 },
    { timestamp: '2026-06-01T10:15:00Z', stress: 0.8 },
  ],
};

beforeEach(() => {
  detailMock.mockReset();
  notesMock.mockReset();
  roles = ['THERAPIST'];
});

describe('SessionReviewPage (#150)', () => {
  it('role-gate: не-терапевт → отказ, API не вызывается', () => {
    roles = ['PATIENT'];
    render(<SessionReviewPage />);

    expect(screen.getByText(/Access restricted to therapists/)).toBeInTheDocument();
    expect(detailMock).not.toHaveBeenCalled();
  });

  it('метаданные: длительность, паттерн, статус', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    render(<SessionReviewPage />);

    expect(await screen.findByText('32 min')).toBeInTheDocument();
    expect(screen.getByText('horizontal')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(detailMock).toHaveBeenCalledWith('s1');
  });

  it('фазы EMDR-протокола показаны бейджами', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    render(<SessionReviewPage />);

    expect(await screen.findByText('preparation')).toBeInTheDocument();
    expect(screen.getByText('desensitization')).toBeInTheDocument();
    expect(screen.getByText('closure')).toBeInTheDocument();
  });

  it('SUDS/VOC: начальные и финальные значения', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    render(<SessionReviewPage />);

    expect(await screen.findByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('timeline: события с типами, safety_alert выделен', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    render(<SessionReviewPage />);

    expect(await screen.findByText('Начнём с безопасного места')).toBeInTheDocument();
    const alert = screen.getByText('Критический уровень стресса');
    expect(alert).toHaveClass('text-red-300');
    // Тип события с подчёркиваниями → пробелы
    expect(screen.getByText('safety alert')).toBeInTheDocument();
  });

  it('пустой timeline → «No timeline events recorded»', async () => {
    detailMock.mockResolvedValueOnce({ ...validSession, timeline: [] });
    render(<SessionReviewPage />);

    expect(await screen.findByText(/No timeline events recorded/)).toBeInTheDocument();
  });

  it('emotion track: ширина бара = stress×100%, цвет по порогам', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    const { container } = render(<SessionReviewPage />);

    await screen.findByText('32 min');
    const bars = container.querySelectorAll('.h-full.rounded-full');
    expect(bars).toHaveLength(2);
    expect((bars[0] as HTMLElement).style.width).toBe('20%');
    expect(bars[0]).toHaveClass('bg-green-500'); // 0.2 < 0.3
    expect((bars[1] as HTMLElement).style.width).toBe('80%');
    expect(bars[1]).toHaveClass('bg-red-500'); // 0.8 >= 0.6
  });

  it('без emotion-данных → «No emotion data recorded»', async () => {
    detailMock.mockResolvedValueOnce({ ...validSession, emotions: [] });
    render(<SessionReviewPage />);

    expect(await screen.findByText(/No emotion data recorded/)).toBeInTheDocument();
  });

  it('заметки префиллятся, сохранение → updateSessionNotes', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    notesMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<SessionReviewPage />);

    const textarea = await screen.findByLabelText(/therapist notes/i);
    expect(textarea).toHaveValue('Старые заметки');

    await user.clear(textarea);
    await user.type(textarea, 'Прогресс заметен');
    await user.click(screen.getByRole('button', { name: /save notes/i }));

    await waitFor(() => expect(notesMock).toHaveBeenCalledWith('s1', 'Прогресс заметен'));
  });

  it('ошибка загрузки → сообщение', async () => {
    detailMock.mockRejectedValueOnce(new Error('Сессия не найдена'));
    render(<SessionReviewPage />);

    expect(await screen.findByText('Сессия не найдена')).toBeInTheDocument();
  });

  it('back-link ведёт на карточку пациента', async () => {
    detailMock.mockResolvedValueOnce(validSession);
    render(<SessionReviewPage />);

    expect(await screen.findByRole('link', { name: /back to patient/i })).toHaveAttribute(
      'href',
      '/patients/p1',
    );
  });
});
