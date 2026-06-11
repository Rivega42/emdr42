/**
 * Spec для app/(protected)/admin/settings/page.tsx (#150) — платформенные
 * настройки: AI-провайдеры, EMDR-протокол, секционное сохранение.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Стабильные ссылки — эффект зависит от [hasRole, router].
const pushMock = jest.fn();
const stableRouter = { push: pushMock };
jest.mock('next/navigation', () => ({
  useRouter: () => stableRouter,
}));

const getSettingsMock = jest.fn();
const updateSettingMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getSettings: (...args: unknown[]) => getSettingsMock(...args),
    updateSetting: (...args: unknown[]) => updateSettingMock(...args),
  },
}));

let roles: string[] = ['ADMIN'];
const stableAuth = { hasRole: (r: string) => roles.includes(r) };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import AdminSettingsPage from '@/app/(protected)/admin/settings/page';

const storedSettings = [
  { key: 'llm_provider', value: 'anthropic' },
  { key: 'app_name', value: 'EMDR-AI' },
  { key: 'maintenance_mode', value: 'false' },
  { key: 'default_bls_speed', value: '1.0' },
];

beforeEach(() => {
  pushMock.mockReset();
  getSettingsMock.mockReset();
  updateSettingMock.mockReset();
  roles = ['ADMIN'];
});

describe('AdminSettingsPage (#150)', () => {
  it('не-ADMIN → redirect, настройки не запрашиваются', () => {
    roles = ['THERAPIST'];
    render(<AdminSettingsPage />);

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(getSettingsMock).not.toHaveBeenCalled();
  });

  it('секции рендерятся: AI Providers, EMDR Protocol, Platform, Notifications', async () => {
    getSettingsMock.mockResolvedValueOnce(storedSettings);
    render(<AdminSettingsPage />);

    expect(await screen.findByText('AI Providers')).toBeInTheDocument();
    expect(screen.getByText('EMDR Protocol')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('значения из getSettings префиллятся в поля', async () => {
    getSettingsMock.mockResolvedValueOnce(storedSettings);
    render(<AdminSettingsPage />);

    await screen.findByText('AI Providers');
    expect(screen.getByDisplayValue('EMDR-AI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('anthropic')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.0')).toBeInTheDocument();
  });

  it('API-ключи — поля type=password (не светятся в UI)', async () => {
    getSettingsMock.mockResolvedValueOnce(storedSettings);
    render(<AdminSettingsPage />);

    await screen.findByText('AI Providers');
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs).toHaveLength(3); // LLM, STT, TTS keys
  });

  it('сохранение секции → updateSetting для каждого заполненного поля', async () => {
    getSettingsMock.mockResolvedValueOnce(storedSettings);
    updateSettingMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AdminSettingsPage />);
    await screen.findByText('Platform');

    // Меняем app_name и сохраняем секцию Platform (3-я кнопка Save)
    const appName = screen.getByDisplayValue('EMDR-AI');
    await user.clear(appName);
    await user.type(appName, 'EMDR-X');

    const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
    await user.click(saveButtons[2]); // Platform

    await waitFor(() => expect(updateSettingMock).toHaveBeenCalledWith('app_name', 'EMDR-X'));
    expect(updateSettingMock).toHaveBeenCalledWith('maintenance_mode', 'false');
    expect(await screen.findByText(/Saved successfully/)).toBeInTheDocument();
  });

  it('boolean-тоггл переключает строковое значение true/false', async () => {
    getSettingsMock.mockResolvedValueOnce(storedSettings);
    updateSettingMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AdminSettingsPage />);
    await screen.findByText('Platform');

    // maintenance_mode=false → серый фон; кликаем тоггл
    const toggles = document.querySelectorAll('button.relative.w-12');
    expect(toggles.length).toBeGreaterThanOrEqual(2);
    await user.click(toggles[0] as HTMLElement);

    const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
    await user.click(saveButtons[2]);

    await waitFor(() => expect(updateSettingMock).toHaveBeenCalledWith('maintenance_mode', 'true'));
  });

  it('ошибка сохранения → сообщение об ошибке', async () => {
    getSettingsMock.mockResolvedValueOnce(storedSettings);
    updateSettingMock.mockRejectedValueOnce(new Error('Validation failed'));
    const user = userEvent.setup();
    render(<AdminSettingsPage />);
    await screen.findByText('Platform');

    const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
    await user.click(saveButtons[2]);

    expect(await screen.findByText('Validation failed')).toBeInTheDocument();
  });
});
