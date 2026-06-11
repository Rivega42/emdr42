/**
 * Spec для app/register/page.tsx (#150) — регистрация + password strength
 * + ToS-чекбокс + invite-flow redirect через sanitizeNextPath.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const pushMock = jest.fn();
const getMock = jest.fn(() => null as string | null);
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getMock }),
}));

const registerMock = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ register: registerMock }),
}));

import RegisterPage from '@/app/register/page';

beforeEach(() => {
  pushMock.mockReset();
  registerMock.mockReset();
  getMock.mockReset();
  getMock.mockReturnValue(null);
});

const fillForm = async (user: ReturnType<typeof userEvent.setup>, password = 'StrongPass#2026') => {
  await user.type(screen.getByLabelText(/^имя$/i), 'Roman');
  await user.type(screen.getByLabelText(/^email$/i), 'a@b.com');
  await user.type(screen.getByLabelText(/^пароль$/i), password);
  await user.type(screen.getByLabelText(/^подтверждение$/i), password);
  await user.click(screen.getByRole('checkbox'));
};

describe('RegisterPage (#150)', () => {
  describe('форма', () => {
    it('рендерит все поля: name, email, password, confirm, ToS, submit', () => {
      render(<RegisterPage />);
      expect(screen.getByLabelText(/^имя$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^пароль$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^подтверждение$/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /создать аккаунт/i })).toBeInTheDocument();
    });

    it('ссылка на /login (для существующих юзеров)', () => {
      render(<RegisterPage />);
      expect(screen.getByRole('link', { name: /войти/i })).toHaveAttribute('href', '/login');
    });

    it('ToS и Privacy ссылки открываются в новой вкладке', () => {
      render(<RegisterPage />);
      const tos = screen.getByRole('link', { name: /terms of service/i });
      const privacy = screen.getByRole('link', { name: /privacy policy/i });
      expect(tos).toHaveAttribute('target', '_blank');
      expect(privacy).toHaveAttribute('target', '_blank');
    });

    it('autoComplete: name/email/new-password (для passmanagers)', () => {
      render(<RegisterPage />);
      expect(screen.getByLabelText(/^имя$/i)).toHaveAttribute('autocomplete', 'name');
      expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText(/^пароль$/i)).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByLabelText(/^подтверждение$/i)).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    });
  });

  describe('password strength indicator', () => {
    it('не показан до первого ввода пароля', () => {
      render(<RegisterPage />);
      expect(screen.queryByText(/Очень слабый|Слабый|Средний|Хороший|Отличный/)).toBeNull();
    });

    it('"Очень слабый" для короткого пароля без символов', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);
      await user.type(screen.getByLabelText(/^пароль$/i), 'abc');
      expect(await screen.findByText(/Очень слабый/)).toBeInTheDocument();
    });

    it('"Отличный" для длинного пароля со всеми классами символов', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);
      await user.type(screen.getByLabelText(/^пароль$/i), 'LongPass#word2026');
      expect(await screen.findByText(/Отличный/)).toBeInTheDocument();
    });

    it('"Хороший" при отсутствии одного из классов (без спецсимвола)', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);
      // 12+ chars, заглавная, цифра, но без спецсимвола = 3 балла = "Хороший"
      await user.type(screen.getByLabelText(/^пароль$/i), 'Password2026'); // 12 chars
      expect(await screen.findByText(/Хороший/)).toBeInTheDocument();
    });
  });

  describe('submit', () => {
    it('успех → registerUser(name, email, password) + router.push на next', async () => {
      registerMock.mockResolvedValueOnce(undefined);
      getMock.mockReturnValue('/dashboard');
      const user = userEvent.setup();
      render(<RegisterPage />);
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

      await waitFor(() =>
        expect(registerMock).toHaveBeenCalledWith('Roman', 'a@b.com', 'StrongPass#2026'),
      );
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });

    it('invite-flow: next=/invite/... сохраняется через sanitizeNextPath', async () => {
      registerMock.mockResolvedValueOnce(undefined);
      getMock.mockReturnValue('/invite/abc123');
      const user = userEvent.setup();
      render(<RegisterPage />);
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/invite/abc123'));
    });

    it('open-redirect: внешний next игнорируется', async () => {
      registerMock.mockResolvedValueOnce(undefined);
      getMock.mockReturnValue('https://evil.com/');
      const user = userEvent.setup();
      render(<RegisterPage />);
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

      await waitFor(() => expect(pushMock).toHaveBeenCalled());
      expect(pushMock.mock.calls[0][0]).not.toMatch(/^https?:\/\/evil\.com/);
    });

    it('error от backend (email уже зарегистрирован) → role=alert', async () => {
      registerMock.mockRejectedValueOnce(new Error('Email уже занят'));
      const user = userEvent.setup();
      render(<RegisterPage />);
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.some((a) => a.textContent?.includes('Email уже занят'))).toBe(true);
    });

    it('не-Error → дефолтное сообщение', async () => {
      registerMock.mockRejectedValueOnce('weird');
      const user = userEvent.setup();
      render(<RegisterPage />);
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.some((a) => a.textContent?.includes('Не удалось создать аккаунт'))).toBe(true);
    });

    it('кнопка disabled пока isSubmitting=true', async () => {
      let resolve!: () => void;
      registerMock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
      const user = userEvent.setup();
      render(<RegisterPage />);
      await fillForm(user);
      await user.click(screen.getByRole('button', { name: /создать аккаунт/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /создаём аккаунт/i })).toBeDisabled();
      });
      resolve!();
    });
  });
});
