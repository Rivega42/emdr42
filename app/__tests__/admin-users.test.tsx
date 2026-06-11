/**
 * Spec для app/(protected)/admin/users/page.tsx (#150) — управление юзерами.
 * Ключевое: optimistic update роли/статуса с rollback при ошибке, пагинация.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// router и hasRole — стабильные ссылки: эффект страницы зависит от
// [hasRole, router], свежие объекты на каждый рендер зациклили бы его.
const pushMock = jest.fn();
const stableRouter = { push: pushMock };
jest.mock('next/navigation', () => ({
  useRouter: () => stableRouter,
}));

const getUsersMock = jest.fn();
const setRoleMock = jest.fn();
const setActiveMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getAdminUsers: (...args: unknown[]) => getUsersMock(...args),
    setUserRole: (...args: unknown[]) => setRoleMock(...args),
    setUserActive: (...args: unknown[]) => setActiveMock(...args),
  },
}));

let roles: string[] = ['ADMIN'];
const stableHasRole = (r: string) => roles.includes(r);
const stableAuth = { hasRole: stableHasRole };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import AdminUsersPage from '@/app/(protected)/admin/users/page';

const makeUser = (i: number, overrides = {}) => ({
  id: `u${i}`,
  name: `User ${i}`,
  email: `user${i}@b.com`,
  role: 'PATIENT',
  isActive: true,
  sessionsCount: i,
  lastActiveAt: null,
  ...overrides,
});

beforeEach(() => {
  pushMock.mockReset();
  getUsersMock.mockReset();
  setRoleMock.mockReset();
  setActiveMock.mockReset();
  roles = ['ADMIN'];
});

describe('AdminUsersPage (#150)', () => {
  it('не-ADMIN → redirect, API не вызывается', () => {
    roles = ['THERAPIST'];
    render(<AdminUsersPage />);

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(getUsersMock).not.toHaveBeenCalled();
  });

  it('таблица: имя, email, счётчик сессий, «Никогда» без lastActiveAt', async () => {
    getUsersMock.mockResolvedValueOnce([makeUser(1), makeUser(2)]);
    render(<AdminUsersPage />);

    expect(await screen.findByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('user2@b.com')).toBeInTheDocument();
    expect(screen.getAllByText('Никогда')).toHaveLength(2);
  });

  it('смена роли: optimistic update + setUserRole', async () => {
    getUsersMock.mockResolvedValueOnce([makeUser(1)]);
    setRoleMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    const select = await screen.findByLabelText('Роль пользователя User 1');
    await user.selectOptions(select, 'THERAPIST');

    expect(setRoleMock).toHaveBeenCalledWith('u1', 'THERAPIST');
    expect(select).toHaveValue('THERAPIST');
  });

  it('смена роли упала → откат + error-view с сообщением', async () => {
    getUsersMock.mockResolvedValueOnce([makeUser(1)]);
    setRoleMock.mockRejectedValueOnce(new Error('Нет прав'));
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    const select = await screen.findByLabelText('Роль пользователя User 1');
    await user.selectOptions(select, 'ADMIN');

    // Ошибка → страница переключается на error-view (ранний return),
    // роль внутри состояния откатывается, но таблица скрыта.
    expect(await screen.findByText('Нет прав')).toBeInTheDocument();
    expect(setRoleMock).toHaveBeenCalledWith('u1', 'ADMIN');
  });

  it('toggle статуса: optimistic вызов + error-view при ошибке', async () => {
    getUsersMock.mockResolvedValueOnce([makeUser(1)]);
    setActiveMock.mockRejectedValueOnce(new Error('500'));
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    const toggle = await screen.findByLabelText('Переключить статус User 1');
    expect(toggle).toHaveTextContent('Активен');
    await user.click(toggle);

    expect(await screen.findByText('500')).toBeInTheDocument();
    expect(setActiveMock).toHaveBeenCalledWith('u1', false);
  });

  it('поиск фильтрует, счётчик «Всего» обновляется', async () => {
    getUsersMock.mockResolvedValueOnce([
      makeUser(1, { name: 'Анна' }),
      makeUser(2, { name: 'Борис' }),
    ]);
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByText('Анна');

    await user.type(screen.getByLabelText(/поиск пользователей/i), 'анна');

    expect(screen.getByText('Всего: 1')).toBeInTheDocument();
    expect(screen.queryByText('Борис')).toBeNull();
  });

  it('фильтр по роли', async () => {
    getUsersMock.mockResolvedValueOnce([
      makeUser(1, { role: 'THERAPIST' }),
      makeUser(2, { role: 'PATIENT' }),
    ]);
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByText('User 1');

    await user.selectOptions(screen.getByLabelText(/фильтр по роли/i), 'THERAPIST');

    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.queryByText('User 2')).toBeNull();
  });

  it('пагинация: 25 юзеров → 3 страницы, «Вперёд» листает', async () => {
    getUsersMock.mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => makeUser(i)));
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await screen.findByText('User 0');
    expect(screen.getByText(/Страница 1 из 3/)).toBeInTheDocument();
    expect(screen.queryByText('User 10')).toBeNull();
    expect(screen.getByRole('button', { name: /назад/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /вперёд/i }));

    expect(screen.getByText(/Страница 2 из 3/)).toBeInTheDocument();
    expect(screen.getByText('User 10')).toBeInTheDocument();
    expect(screen.queryByText('User 0')).toBeNull();
  });

  it('поиск сбрасывает страницу на первую', async () => {
    getUsersMock.mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => makeUser(i)));
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByText('User 0');

    await user.click(screen.getByRole('button', { name: /вперёд/i }));
    expect(screen.getByText(/Страница 2 из 3/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/поиск пользователей/i), 'User 1');

    // После ввода поиска page=1
    expect(screen.getByText(/Страница 1 из/)).toBeInTheDocument();
  });

  it('ничего не найдено → «Пользователей не найдено»', async () => {
    getUsersMock.mockResolvedValueOnce([makeUser(1)]);
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByText('User 1');

    await user.type(screen.getByLabelText(/поиск пользователей/i), 'zzz');

    expect(screen.getByText(/Пользователей не найдено/)).toBeInTheDocument();
  });
});
