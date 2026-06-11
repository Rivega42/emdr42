/**
 * Spec для app/login/page.tsx (#150) — login flow с MFA-step и open-redirect защитой.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mocks
const pushMock = jest.fn();
const getMock = jest.fn(() => null as string | null);
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getMock }),
}));

const loginMock = jest.fn();
const completeMfaMock = jest.fn();
jest.mock('@/contexts/AuthContext', () => {
  class MfaRequiredError extends Error {
    constructor(public mfaToken: string) {
      super('MFA required');
    }
  }
  return {
    MfaRequiredError,
    useAuth: () => ({ login: loginMock, completeMfa: completeMfaMock }),
  };
});

import LoginPage from '@/app/login/page';
import { MfaRequiredError } from '@/contexts/AuthContext';

beforeEach(() => {
  pushMock.mockReset();
  loginMock.mockReset();
  completeMfaMock.mockReset();
  getMock.mockReset();
  getMock.mockReturnValue(null);
});

describe('LoginPage (#150)', () => {
  describe('форма логина', () => {
    it('рендерит email + password + submit + ссылку на регистрацию', () => {
      render(<LoginPage />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /зарегистрироваться/i })).toHaveAttribute(
        'href',
        '/register',
      );
    });

    it('успешный логин → redirect на next или /dashboard', async () => {
      loginMock.mockResolvedValueOnce(undefined);
      getMock.mockReturnValue('/dashboard');
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));

      await waitFor(() => expect(loginMock).toHaveBeenCalledWith('a@b.com', 'password123'));
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });

    it('open-redirect защита: внешний next игнорируется', async () => {
      loginMock.mockResolvedValueOnce(undefined);
      getMock.mockReturnValue('https://evil.com');
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));

      await waitFor(() => expect(pushMock).toHaveBeenCalled());
      // sanitizeNextPath отбрасывает внешний URL → дефолтный путь
      const pushedTo = pushMock.mock.calls[0][0];
      expect(pushedTo).not.toMatch(/^https?:\/\/evil\.com/);
    });

    it('login error: ошибка показана в role=alert', async () => {
      loginMock.mockRejectedValueOnce(new Error('Неверный пароль'));
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Неверный пароль');
      expect(pushMock).not.toHaveBeenCalled();
    });

    it('не-Error ошибка → дефолтное сообщение', async () => {
      loginMock.mockRejectedValueOnce('plain string');
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Неверный email или пароль/);
    });

    it('кнопка disabled пока isSubmitting=true', async () => {
      let resolve!: () => void;
      loginMock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /входим/i })).toBeDisabled();
      });

      resolve!();
      await waitFor(() => expect(pushMock).toHaveBeenCalled());
    });
  });

  describe('MFA flow', () => {
    const triggerMfa = async (user: ReturnType<typeof userEvent.setup>) => {
      loginMock.mockRejectedValueOnce(new MfaRequiredError('mfa-tok-123'));
      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));
      await screen.findByText(/Двухфакторная аутентификация/i);
    };

    it('MfaRequiredError → форма ввода TOTP-кода, форма логина скрыта', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);
      await triggerMfa(user);

      expect(screen.getByLabelText(/Код из приложения/i)).toBeInTheDocument();
      // Старая форма логина скрыта (email-инпут больше не присутствует)
      expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    });

    it('completeMfa успешно → router.push', async () => {
      completeMfaMock.mockResolvedValueOnce(undefined);
      getMock.mockReturnValue('/dashboard');
      const user = userEvent.setup();
      render(<LoginPage />);
      await triggerMfa(user);

      await user.type(screen.getByLabelText(/Код из приложения/i), '123456');
      await user.click(screen.getByRole('button', { name: /подтвердить/i }));

      await waitFor(() => expect(completeMfaMock).toHaveBeenCalledWith('mfa-tok-123', '123456'));
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });

    it('кнопка подтверждения disabled при пустом коде', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);
      await triggerMfa(user);

      expect(screen.getByRole('button', { name: /подтвердить/i })).toBeDisabled();
    });

    it('completeMfa ошибка → error в role=alert', async () => {
      completeMfaMock.mockRejectedValueOnce(new Error('Код неверный'));
      const user = userEvent.setup();
      render(<LoginPage />);
      await triggerMfa(user);

      await user.type(screen.getByLabelText(/Код из приложения/i), '999999');
      await user.click(screen.getByRole('button', { name: /подтвердить/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Код неверный');
    });

    it('«Начать заново» возвращает форму логина и чистит ошибки', async () => {
      completeMfaMock.mockRejectedValueOnce(new Error('Код неверный'));
      const user = userEvent.setup();
      render(<LoginPage />);
      await triggerMfa(user);
      await user.type(screen.getByLabelText(/Код из приложения/i), '999999');
      await user.click(screen.getByRole('button', { name: /подтвердить/i }));
      await screen.findByRole('alert');

      await user.click(screen.getByRole('button', { name: /Начать заново/i }));

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Код из приложения/i)).toBeNull();
    });
  });

  describe('a11y', () => {
    it('email input имеет autoComplete="email"', () => {
      render(<LoginPage />);
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    });

    it('password input имеет autoComplete="current-password"', () => {
      render(<LoginPage />);
      expect(screen.getByLabelText(/пароль/i)).toHaveAttribute('autocomplete', 'current-password');
    });

    it('MFA input имеет autoComplete="one-time-code"', async () => {
      loginMock.mockRejectedValueOnce(new MfaRequiredError('t'));
      const user = userEvent.setup();
      render(<LoginPage />);
      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/пароль/i), 'password123');
      await user.click(screen.getByRole('button', { name: /войти/i }));
      const mfaInput = await screen.findByLabelText(/Код из приложения/i);
      expect(mfaInput).toHaveAttribute('autocomplete', 'one-time-code');
    });
  });
});
