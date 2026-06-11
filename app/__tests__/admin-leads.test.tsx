/**
 * Spec для app/(protected)/admin/leads/page.tsx (#150) — CRM-заявки с сайта.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const listLeadsMock = jest.fn();
const updateLeadMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    listLeads: (...args: unknown[]) => listLeadsMock(...args),
    updateLead: (...args: unknown[]) => updateLeadMock(...args),
  },
}));

let roles: string[] = ['ADMIN'];
const stableAuth = { hasRole: (r: string) => roles.includes(r) };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

import LeadsPage from '@/app/(protected)/admin/leads/page';

const leads = [
  {
    id: 'l1',
    email: 'lead1@b.com',
    name: 'Иван',
    phone: null,
    status: 'NEW',
    source: 'landing',
    message: null,
    assignedTherapistId: null,
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    id: 'l2',
    email: 'lead2@b.com',
    name: null,
    phone: null,
    status: 'CONTACTED',
    source: null,
    message: null,
    assignedTherapistId: null,
    createdAt: '2026-06-09T10:00:00Z',
  },
];

beforeEach(() => {
  listLeadsMock.mockReset();
  updateLeadMock.mockReset();
  roles = ['ADMIN'];
});

describe('LeadsPage (#150)', () => {
  it('gate: без ADMIN/THERAPIST → заглушка', () => {
    roles = ['PATIENT'];
    listLeadsMock.mockResolvedValueOnce({ items: [] });
    render(<LeadsPage />);

    expect(screen.getByText(/Доступ только для администраторов и терапевтов/)).toBeInTheDocument();
  });

  it('THERAPIST тоже имеет доступ', async () => {
    roles = ['THERAPIST'];
    listLeadsMock.mockResolvedValueOnce({ items: leads });
    render(<LeadsPage />);

    expect(await screen.findByText('lead1@b.com')).toBeInTheDocument();
  });

  it('таблица: email, имя/source с «—» для null, дата', async () => {
    listLeadsMock.mockResolvedValueOnce({ items: leads });
    render(<LeadsPage />);

    expect(await screen.findByText('lead1@b.com')).toBeInTheDocument();
    expect(screen.getByText('Иван')).toBeInTheDocument();
    expect(screen.getByText('landing')).toBeInTheDocument();
    // У второго лида name и source null → две «—»
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('пустой список → «Лидов нет»', async () => {
    listLeadsMock.mockResolvedValueOnce({ items: [] });
    render(<LeadsPage />);

    expect(await screen.findByText(/Лидов нет/)).toBeInTheDocument();
  });

  it('ошибка → role=alert', async () => {
    listLeadsMock.mockRejectedValueOnce(new Error('CRM недоступен'));
    render(<LeadsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('CRM недоступен');
  });

  it('фильтр по статусу → повторный запрос с этим статусом', async () => {
    listLeadsMock.mockResolvedValue({ items: leads });
    const user = userEvent.setup();
    render(<LeadsPage />);
    await screen.findByText('lead1@b.com');
    expect(listLeadsMock).toHaveBeenCalledWith(undefined);

    await user.selectOptions(screen.getByLabelText(/фильтр/i), 'NEW');

    await waitFor(() => expect(listLeadsMock).toHaveBeenCalledWith('NEW'));
  });

  it('смена статуса лида → updateLead + локальное обновление', async () => {
    listLeadsMock.mockResolvedValueOnce({ items: leads });
    updateLeadMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<LeadsPage />);
    await screen.findByText('lead1@b.com');

    // Селект статуса в первой строке (фильтр — отдельный, по label)
    const rowSelects = screen.getAllByRole('combobox');
    // [0] — фильтр, [1] — статус первого лида
    await user.selectOptions(rowSelects[1], 'BOOKED');

    await waitFor(() => expect(updateLeadMock).toHaveBeenCalledWith('l1', { status: 'BOOKED' }));
    expect(rowSelects[1]).toHaveValue('BOOKED');
  });

  it('ссылка назад на /admin', async () => {
    listLeadsMock.mockResolvedValueOnce({ items: [] });
    render(<LeadsPage />);

    expect(await screen.findByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin');
  });
});
