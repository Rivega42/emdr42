/**
 * Spec для app/invite/[token]/page.tsx (#150) — принятие приглашения от терапевта.
 * Ключевое: ветвление гость/залогинен, redirect на register с next= и email=.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const pushMock = jest.fn();
let paramsToken: string | undefined = 'inv-tok-1';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ token: paramsToken }),
}));

const previewMock = jest.fn();
const acceptMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    previewPatientInvite: (...args: unknown[]) => previewMock(...args),
    acceptPatientInvite: (...args: unknown[]) => acceptMock(...args),
  },
}));

let authState: { user: { id: string } | null; loading: boolean } = {
  user: null,
  loading: false,
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import InvitePage from '@/app/invite/[token]/page';

const validPreview = {
  therapistName: 'Доктор Иванова',
  expiresAt: '2026-07-01T00:00:00Z',
  requiresEmail: null,
};

beforeEach(() => {
  pushMock.mockReset();
  previewMock.mockReset();
  acceptMock.mockReset();
  paramsToken = 'inv-tok-1';
  authState = { user: null, loading: false };
});

describe('InvitePage (#150)', () => {
  it('loading state пока preview не загружен', () => {
    previewMock.mockReturnValue(new Promise(() => {})); // вечный pending
    render(<InvitePage />);
    expect(screen.getByRole('status')).toHaveTextContent(/Загрузка/);
  });

  it('preview ошибка (битый токен) → role=alert + ссылка на главную', async () => {
    previewMock.mockRejectedValueOnce(new Error('Приглашение не найдено'));
    render(<InvitePage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Приглашение не найдено');
    expect(screen.getByRole('link', { name: /на главную/i })).toHaveAttribute('href', '/');
  });

  it('валидный preview → имя терапевта и срок действия', async () => {
    previewMock.mockResolvedValueOnce(validPreview);
    render(<InvitePage />);

    expect(await screen.findByText('Доктор Иванова')).toBeInTheDocument();
    expect(screen.getByText(/Срок действия/)).toBeInTheDocument();
    expect(previewMock).toHaveBeenCalledWith('inv-tok-1');
  });

  it('requiresEmail в preview → email показан в тексте', async () => {
    previewMock.mockResolvedValueOnce({ ...validPreview, requiresEmail: 'p@b.com' });
    render(<InvitePage />);

    expect(await screen.findByText('p@b.com')).toBeInTheDocument();
    expect(screen.getByText(/привязано к email/)).toBeInTheDocument();
  });

  describe('гость (не залогинен)', () => {
    it('кнопка «Зарегистрироваться и принять» → push на /register с next=', async () => {
      previewMock.mockResolvedValueOnce(validPreview);
      const user = userEvent.setup();
      render(<InvitePage />);

      await user.click(
        await screen.findByRole('button', { name: /зарегистрироваться и принять/i }),
      );

      expect(pushMock).toHaveBeenCalledWith(
        `/register?next=${encodeURIComponent('/invite/inv-tok-1')}`,
      );
      expect(acceptMock).not.toHaveBeenCalled();
    });

    it('requiresEmail → email= добавлен в register URL', async () => {
      previewMock.mockResolvedValueOnce({ ...validPreview, requiresEmail: 'p@b.com' });
      const user = userEvent.setup();
      render(<InvitePage />);

      await user.click(
        await screen.findByRole('button', { name: /зарегистрироваться и принять/i }),
      );

      expect(pushMock).toHaveBeenCalledWith(
        `/register?next=${encodeURIComponent('/invite/inv-tok-1')}&email=${encodeURIComponent('p@b.com')}`,
      );
    });

    it('ссылка «Войти» содержит next= на invite', async () => {
      previewMock.mockResolvedValueOnce(validPreview);
      render(<InvitePage />);

      const link = await screen.findByRole('link', { name: /уже есть аккаунт/i });
      expect(link).toHaveAttribute(
        'href',
        `/login?next=${encodeURIComponent('/invite/inv-tok-1')}`,
      );
    });
  });

  describe('залогинен', () => {
    beforeEach(() => {
      authState = { user: { id: 'u1' }, loading: false };
    });

    it('кнопка «Принять приглашение» → acceptPatientInvite + redirect через 1.5с', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      previewMock.mockResolvedValueOnce(validPreview);
      acceptMock.mockResolvedValueOnce(undefined);
      render(<InvitePage />);

      await user.click(await screen.findByRole('button', { name: /принять приглашение/i }));

      const status = await screen.findByRole('status');
      expect(status).toHaveTextContent(/Приглашение принято/);
      expect(acceptMock).toHaveBeenCalledWith('inv-tok-1');
      expect(pushMock).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
      jest.useRealTimers();
    });

    it('accept ошибка (истёк/чужой email) → role=alert, кнопка снова активна', async () => {
      previewMock.mockResolvedValueOnce(validPreview);
      acceptMock.mockRejectedValueOnce(new Error('Приглашение истекло'));
      const user = userEvent.setup();
      render(<InvitePage />);

      await user.click(await screen.findByRole('button', { name: /принять приглашение/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Приглашение истекло');
      expect(screen.getByRole('button', { name: /принять приглашение/i })).toBeEnabled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it('не-Error → дефолтное сообщение', async () => {
      previewMock.mockResolvedValueOnce(validPreview);
      acceptMock.mockRejectedValueOnce('weird');
      const user = userEvent.setup();
      render(<InvitePage />);

      await user.click(await screen.findByRole('button', { name: /принять приглашение/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Не удалось принять приглашение/);
    });

    it('auth loading=true → кнопки скрыты до завершения проверки', async () => {
      authState = { user: null, loading: true };
      previewMock.mockResolvedValueOnce(validPreview);
      render(<InvitePage />);

      await screen.findByText('Доктор Иванова');
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  it('без token → preview не запрашивается', () => {
    paramsToken = undefined;
    previewMock.mockResolvedValueOnce(validPreview);
    render(<InvitePage />);
    expect(previewMock).not.toHaveBeenCalled();
  });
});
