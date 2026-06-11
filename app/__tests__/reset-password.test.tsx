/**
 * Spec для app/reset-password/page.tsx (#150) — установка нового пароля по токену.
 * Ключевое: guard на отсутствующий token, redirect на /login после успеха.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const pushMock = jest.fn();
const getMock = jest.fn(() => null as string | null);
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getMock }),
}));

const resetPasswordMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { resetPassword: (...args: unknown[]) => resetPasswordMock(...args) },
}));

import ResetPasswordPage from '@/app/reset-password/page';

beforeEach(() => {
  pushMock.mockReset();
  resetPasswordMock.mockReset();
  getMock.mockReset();
  getMock.mockReturnValue('tok-123');
});

const fillForm = async (user: ReturnType<typeof userEvent.setup>, password = 'StrongPass#2026') => {
  await user.type(screen.getByLabelText(/^новый пароль$/i), password);
  await user.type(screen.getByLabelText(/^подтверждение$/i), password);
};

describe('ResetPasswordPage (#150)', () => {
  describe('guard без токена', () => {
    it('нет token в URL → экран «Ссылка недействительна» вместо формы', () => {
      getMock.mockReturnValue(null);
      render(<ResetPasswordPage />);

      expect(screen.getByText(/Ссылка недействительна/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/новый пароль/i)).toBeNull();
      expect(screen.getByRole('link', { name: /запросить новую/i })).toHaveAttribute(
        'href',
        '/forgot-password',
      );
    });
  });

  describe('форма с токеном', () => {
    it('рендерит поля пароля + подтверждения с new-password autoComplete', () => {
      render(<ResetPasswordPage />);
      const password = screen.getByLabelText(/^новый пароль$/i);
      const confirm = screen.getByLabelText(/^подтверждение$/i);
      expect(password).toHaveAttribute('autocomplete', 'new-password');
      expect(confirm).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByRole('button', { name: /изменить пароль/i })).toBeInTheDocument();
    });

    it('успех → resetPassword(token, password), экран успеха, redirect через 2.5с', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      resetPasswordMock.mockResolvedValueOnce(undefined);
      render(<ResetPasswordPage />);

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /изменить пароль/i }));

      const status = await screen.findByRole('status');
      expect(status).toHaveTextContent(/Пароль изменён/);
      expect(resetPasswordMock).toHaveBeenCalledWith('tok-123', 'StrongPass#2026');
      // Redirect отложен на 2.5 секунды
      expect(pushMock).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(2500);
      });
      expect(pushMock).toHaveBeenCalledWith('/login');
      jest.useRealTimers();
    });

    it('истёкший/невалидный токен → ошибка backend в role=alert, форма остаётся', async () => {
      resetPasswordMock.mockRejectedValueOnce(new Error('Токен устарел'));
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /изменить пароль/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.some((a) => a.textContent?.includes('Токен устарел'))).toBe(true);
      // Форма не скрыта — можно исправить и повторить
      expect(screen.getByLabelText(/^новый пароль$/i)).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it('не-Error → дефолтное сообщение с подсказкой запросить новую ссылку', async () => {
      resetPasswordMock.mockRejectedValueOnce('weird');
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /изменить пароль/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.some((a) => a.textContent?.includes('Не удалось сбросить пароль'))).toBe(true);
    });

    it('кнопка disabled пока isSubmitting=true', async () => {
      let resolve!: () => void;
      resetPasswordMock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /изменить пароль/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /сохраняем/i })).toBeDisabled();
      });
      resolve!();
      await screen.findByRole('status');
    });
  });
});
