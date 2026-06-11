/**
 * Spec для app/(protected)/settings/page.tsx (#150) — профиль, тогглы,
 * GDPR-экспорт (Art. 15) и удаление аккаунта с grace period (Art. 17).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const updateProfileMock = jest.fn();
const exportMock = jest.fn();
const deletionMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
    exportMyData: (...args: unknown[]) => exportMock(...args),
    requestAccountDeletion: (...args: unknown[]) => deletionMock(...args),
  },
}));

const logoutMock = jest.fn();
// user должен быть стабильной ссылкой (как в реальном контексте) —
// иначе useEffect [user] сбрасывает имя на каждом рендере.
const stableUser = { name: 'Roman', email: 'r@b.com' };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: stableUser, logout: logoutMock }),
}));

import SettingsPage from '@/app/(protected)/settings/page';

beforeEach(() => {
  pushMock.mockReset();
  updateProfileMock.mockReset();
  exportMock.mockReset();
  deletionMock.mockReset();
  logoutMock.mockReset();
});

describe('SettingsPage (#150)', () => {
  describe('профиль', () => {
    it('имя префиллится из user, email disabled', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/^имя$/i)).toHaveValue('Roman');
      const email = screen.getByLabelText(/^email$/i, { selector: 'input' });
      expect(email).toHaveValue('r@b.com');
      expect(email).toBeDisabled();
    });
  });

  describe('тогглы', () => {
    it('дефолты: email-уведомления и адаптивный режим on, SMS off', () => {
      render(<SettingsPage />);
      expect(screen.getByRole('switch', { name: 'Email' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('switch', { name: 'Адаптивный режим' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('switch', { name: 'SMS' })).toHaveAttribute('aria-checked', 'false');
    });

    it('клик переключает aria-checked', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      const sms = screen.getByRole('switch', { name: 'SMS' });

      await user.click(sms);
      expect(sms).toHaveAttribute('aria-checked', 'true');
      await user.click(sms);
      expect(sms).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('сохранение', () => {
    it('успех → updateProfile с именем и настройками, статус «Сохранено»', async () => {
      updateProfileMock.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.clear(screen.getByLabelText(/^имя$/i));
      await user.type(screen.getByLabelText(/^имя$/i), 'Новое Имя');
      await user.click(screen.getByRole('switch', { name: 'SMS' }));
      await user.click(screen.getByRole('button', { name: /^сохранить$/i }));

      expect(await screen.findByRole('status')).toHaveTextContent('Сохранено');
      expect(updateProfileMock).toHaveBeenCalledWith({
        name: 'Новое Имя',
        settings: expect.objectContaining({
          notifications: expect.objectContaining({ sms: true }),
        }),
      });
    });

    it('ошибка → role=alert «Ошибка сохранения»', async () => {
      updateProfileMock.mockRejectedValueOnce(new Error('500'));
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /^сохранить$/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Ошибка сохранения');
    });

    it('кнопка disabled пока saving', async () => {
      let resolve!: () => void;
      updateProfileMock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /^сохранить$/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /сохраняем/i })).toBeDisabled();
      });
      resolve!();
      await screen.findByRole('status');
    });
  });

  describe('GDPR-экспорт (Art. 15)', () => {
    it('скачивание: blob → object URL → click → revoke', async () => {
      const blob = new Blob(['{}'], { type: 'application/json' });
      exportMock.mockResolvedValueOnce(blob);
      const createUrl = jest.fn(() => 'blob:fake');
      const revokeUrl = jest.fn();
      URL.createObjectURL = createUrl;
      URL.revokeObjectURL = revokeUrl;
      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /скачать свои данные/i }));

      await waitFor(() => expect(exportMock).toHaveBeenCalled());
      expect(createUrl).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
      clickSpy.mockRestore();
    });

    it('ошибка экспорта → alert(), без падения', async () => {
      exportMock.mockRejectedValueOnce(new Error('500'));
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /скачать свои данные/i }));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Не удалось скачать данные.'));
      alertSpy.mockRestore();
    });
  });

  describe('удаление аккаунта (Art. 17)', () => {
    it('confirm отклонён → API не вызывается', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /удалить аккаунт/i }));

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('30 дней'));
      expect(deletionMock).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('confirm принят → requestAccountDeletion + logout + push на главную', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      deletionMock.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /удалить аккаунт/i }));

      await waitFor(() => expect(deletionMock).toHaveBeenCalled());
      expect(logoutMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/');
      confirmSpy.mockRestore();
    });

    it('ошибка удаления → alert, кнопка снова активна, без logout', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      deletionMock.mockRejectedValueOnce(new Error('500'));
      const user = userEvent.setup();
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: /удалить аккаунт/i }));

      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      expect(logoutMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /удалить аккаунт/i })).toBeEnabled();
      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });
});
