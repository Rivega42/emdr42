/**
 * Spec для app/forgot-password/page.tsx (#150) — запрос сброса пароля.
 * Ключевое: anti-enumeration — успешный экран показывается даже при ошибке API.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const forgotPasswordMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { forgotPassword: (...args: unknown[]) => forgotPasswordMock(...args) },
}));

import ForgotPasswordPage from '@/app/forgot-password/page';

beforeEach(() => {
  forgotPasswordMock.mockReset();
});

describe('ForgotPasswordPage (#150)', () => {
  it('рендерит email-поле, submit и ссылку назад ко входу', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /отправить ссылку/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /назад ко входу/i })).toHaveAttribute('href', '/login');
  });

  it('успешный запрос → экран «Проверьте email» с role=status', async () => {
    forgotPasswordMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /отправить ссылку/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/Проверьте email/);
    expect(forgotPasswordMock).toHaveBeenCalledWith('a@b.com');
    // Форма скрыта после сабмита
    expect(screen.queryByLabelText(/email/i)).toBeNull();
  });

  it('anti-enumeration: API-ошибка → ТОТ ЖЕ экран успеха, без текста ошибки', async () => {
    forgotPasswordMock.mockRejectedValueOnce(new Error('User not found'));
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'nonexistent@b.com');
    await user.click(screen.getByRole('button', { name: /отправить ссылку/i }));

    // Экран успеха показан несмотря на ошибку — нельзя выдать существование аккаунта
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/Если аккаунт с таким email существует/);
    expect(screen.queryByText(/User not found/)).toBeNull();
  });

  it('экран успеха содержит ссылку возврата на /login', async () => {
    forgotPasswordMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /отправить ссылку/i }));

    await screen.findByRole('status');
    expect(screen.getByRole('link', { name: /вернуться ко входу/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('кнопка disabled пока isSubmitting=true', async () => {
    let resolve!: () => void;
    forgotPasswordMock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /отправить ссылку/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /отправляем/i })).toBeDisabled();
    });
    resolve!();
    await screen.findByRole('status');
  });

  it('a11y: email input имеет autoComplete="email"', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
  });
});
