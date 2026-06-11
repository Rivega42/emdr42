/**
 * Spec для app/(protected)/progress/compare/page.tsx (#150) — сравнение
 * двух сессий. Ключевое: семантика дельт (SUDS вниз = хорошо, VOC вверх = хорошо).
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

let searchParams = new Map<string, string>();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => searchParams.get(k) ?? null }),
}));

const compareMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { compareSessions: (...args: unknown[]) => compareMock(...args) },
}));

import CompareSessionsPage from '@/app/(protected)/progress/compare/page';

const validData = {
  current: { id: 'c1', sessionNumber: 5, sudsFinal: 3, vocFinal: 6 },
  previous: { id: 'p1', sessionNumber: 4, sudsFinal: 6, vocFinal: 4 },
  delta: {
    sudsDelta: -3,
    vocDelta: 2,
    avgStressDelta: -0.15,
    effectivenessScore: 78,
  },
};

beforeEach(() => {
  compareMock.mockReset();
  searchParams = new Map([
    ['current', 'c1'],
    ['previous', 'p1'],
  ]);
});

describe('CompareSessionsPage (#150)', () => {
  it('без параметров в URL → ошибка с подсказкой, API не вызывается', async () => {
    searchParams = new Map();
    render(<CompareSessionsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Укажите обе сессии в URL/);
    expect(compareMock).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /назад к прогрессу/i })).toHaveAttribute(
      'href',
      '/progress',
    );
  });

  it('loading → role=status', () => {
    compareMock.mockReturnValue(new Promise(() => {}));
    render(<CompareSessionsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/Загрузка/);
  });

  it('ошибка API → role=alert', async () => {
    compareMock.mockRejectedValueOnce(new Error('Сессия не найдена'));
    render(<CompareSessionsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Сессия не найдена');
  });

  it('заголовок и карточки: номера сессий, SUDS/VOC значения', async () => {
    compareMock.mockResolvedValueOnce(validData);
    render(<CompareSessionsPage />);

    expect(await screen.findByText(/Сессия #5 vs #4/)).toBeInTheDocument();
    expect(compareMock).toHaveBeenCalledWith('c1', 'p1');
    expect(screen.getByText('Предыдущая')).toBeInTheDocument();
    expect(screen.getByText('Текущая')).toBeInTheDocument();
  });

  it('SUDS снизился (delta=-3) → зелёная стрелка вниз (улучшение)', async () => {
    compareMock.mockResolvedValueOnce(validData);
    render(<CompareSessionsPage />);

    const suds = await screen.findByText('↓ 3.0');
    expect(suds).toHaveClass('text-green-600');
  });

  it('VOC вырос (delta=+2) → зелёная стрелка вверх (улучшение)', async () => {
    compareMock.mockResolvedValueOnce(validData);
    render(<CompareSessionsPage />);

    const voc = await screen.findByText('↑ 2.0');
    expect(voc).toHaveClass('text-green-600');
  });

  it('SUDS вырос → красная стрелка вверх (ухудшение)', async () => {
    compareMock.mockResolvedValueOnce({
      ...validData,
      delta: { ...validData.delta, sudsDelta: 1.5 },
    });
    render(<CompareSessionsPage />);

    const suds = await screen.findByText('↑ 1.5');
    expect(suds).toHaveClass('text-red-600');
  });

  it('VOC упал → красная стрелка вниз (ухудшение)', async () => {
    compareMock.mockResolvedValueOnce({
      ...validData,
      delta: { ...validData.delta, vocDelta: -1 },
    });
    render(<CompareSessionsPage />);

    const voc = await screen.findByText('↓ 1.0');
    expect(voc).toHaveClass('text-red-600');
  });

  it('нулевая дельта → серая стрелка →', async () => {
    compareMock.mockResolvedValueOnce({
      ...validData,
      delta: { ...validData.delta, sudsDelta: 0 },
    });
    render(<CompareSessionsPage />);

    const zero = await screen.findByText('→ 0.0');
    expect(zero).toHaveClass('text-gray-600');
  });

  it('null-дельты → «—» без стрелок и цветов', async () => {
    compareMock.mockResolvedValueOnce({
      ...validData,
      delta: { sudsDelta: null, vocDelta: null, avgStressDelta: null, effectivenessScore: null },
    });
    render(<CompareSessionsPage />);

    await screen.findByText(/Сессия #5 vs #4/);
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('эффективность форматируется процентом, стресс — двумя знаками', async () => {
    compareMock.mockResolvedValueOnce(validData);
    render(<CompareSessionsPage />);

    expect(await screen.findByText('↑ 78%')).toBeInTheDocument();
    expect(screen.getByText('↓ 0.15')).toBeInTheDocument();
  });

  it('null SUDS/VOC в карточке сессии → «—»', async () => {
    compareMock.mockResolvedValueOnce({
      ...validData,
      previous: { id: 'p1', sessionNumber: 4, sudsFinal: null, vocFinal: null },
    });
    render(<CompareSessionsPage />);

    await screen.findByText(/Сессия #5 vs #4/);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
