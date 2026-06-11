/**
 * Spec для app/(protected)/patients/page.tsx (#150) — список пациентов терапевта.
 * Ключевое: role-gate, fallback на старый API, клиентский поиск, клик по строке.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const assignedMock = jest.fn();
const myPatientsMock = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getAssignedPatients: (...args: unknown[]) => assignedMock(...args),
    getMyPatients: (...args: unknown[]) => myPatientsMock(...args),
  },
}));

let roles: string[] = ['THERAPIST'];
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hasRole: (r: string) => roles.includes(r) }),
}));

import PatientsPage from '@/app/(protected)/patients/page';

const assignedResponse = {
  items: [
    {
      patient: { id: 'p1', name: 'Анна Смирнова', email: 'anna@b.com', createdAt: '2026-01-01' },
    },
    {
      patient: { id: 'p2', name: 'Борис Ким', email: 'boris@b.com', createdAt: '2026-02-01' },
    },
  ],
};

const legacyPatients = [
  {
    id: 'p3',
    name: 'Вера Ли',
    email: 'vera@b.com',
    role: 'PATIENT',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    sessionsCount: 7,
    lastSessionAt: '2026-06-01T10:00:00Z',
    avgSudsReduction: 2.5,
  },
];

beforeEach(() => {
  pushMock.mockReset();
  assignedMock.mockReset();
  myPatientsMock.mockReset();
  roles = ['THERAPIST'];
});

describe('PatientsPage (#150)', () => {
  it('role-gate: PATIENT видит «Доступ только для терапевтов», API не вызывается', () => {
    roles = ['PATIENT'];
    render(<PatientsPage />);

    expect(screen.getByText(/Доступ только для терапевтов/)).toBeInTheDocument();
    expect(assignedMock).not.toHaveBeenCalled();
    expect(myPatientsMock).not.toHaveBeenCalled();
  });

  it('ADMIN тоже имеет доступ', async () => {
    roles = ['ADMIN'];
    assignedMock.mockResolvedValueOnce(assignedResponse);
    render(<PatientsPage />);

    expect(await screen.findByText('Анна Смирнова')).toBeInTheDocument();
  });

  it('основной API: пациенты из getAssignedPatients в таблице', async () => {
    assignedMock.mockResolvedValueOnce(assignedResponse);
    render(<PatientsPage />);

    expect(await screen.findByText('Анна Смирнова')).toBeInTheDocument();
    expect(screen.getByText('Борис Ким')).toBeInTheDocument();
    expect(screen.getByText('anna@b.com')).toBeInTheDocument();
  });

  it('fallback: getAssignedPatients упал → getMyPatients со старым форматом', async () => {
    assignedMock.mockRejectedValueOnce(new Error('404'));
    myPatientsMock.mockResolvedValueOnce(legacyPatients);
    render(<PatientsPage />);

    expect(await screen.findByText('Вера Ли')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument(); // sessionsCount
    // avgSudsReduction 2.5 > 0 → стрелка вниз (улучшение)
    expect(screen.getByText(/↓2\.5/)).toBeInTheDocument();
  });

  it('оба API упали → role=alert с сообщением второй ошибки', async () => {
    assignedMock.mockRejectedValueOnce(new Error('404'));
    myPatientsMock.mockRejectedValueOnce(new Error('Сервер недоступен'));
    render(<PatientsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер недоступен');
  });

  it('пустой список → «Пациенты пока не назначены»', async () => {
    assignedMock.mockResolvedValueOnce({ items: [] });
    render(<PatientsPage />);

    expect(await screen.findByText(/Пациенты пока не назначены/)).toBeInTheDocument();
  });

  it('поиск фильтрует по имени и email (case-insensitive)', async () => {
    assignedMock.mockResolvedValueOnce(assignedResponse);
    const user = userEvent.setup();
    render(<PatientsPage />);
    await screen.findByText('Анна Смирнова');

    await user.type(screen.getByLabelText(/поиск пациентов/i), 'БОРИС');

    expect(screen.queryByText('Анна Смирнова')).toBeNull();
    expect(screen.getByText('Борис Ким')).toBeInTheDocument();
  });

  it('поиск по email тоже работает', async () => {
    assignedMock.mockResolvedValueOnce(assignedResponse);
    const user = userEvent.setup();
    render(<PatientsPage />);
    await screen.findByText('Анна Смирнова');

    await user.type(screen.getByLabelText(/поиск пациентов/i), 'anna@');

    expect(screen.getByText('Анна Смирнова')).toBeInTheDocument();
    expect(screen.queryByText('Борис Ким')).toBeNull();
  });

  it('поиск без результатов → «По запросу ничего не найдено»', async () => {
    assignedMock.mockResolvedValueOnce(assignedResponse);
    const user = userEvent.setup();
    render(<PatientsPage />);
    await screen.findByText('Анна Смирнова');

    await user.type(screen.getByLabelText(/поиск пациентов/i), 'zzz');

    expect(screen.getByText(/По запросу ничего не найдено/)).toBeInTheDocument();
  });

  it('клик по строке → push на /patients/[id]', async () => {
    assignedMock.mockResolvedValueOnce(assignedResponse);
    const user = userEvent.setup();
    render(<PatientsPage />);

    await user.click(await screen.findByText('Анна Смирнова'));

    expect(pushMock).toHaveBeenCalledWith('/patients/p1');
  });

  it('a11y: строка — role=link, Enter тоже открывает пациента', async () => {
    assignedMock.mockResolvedValueOnce(assignedResponse);
    const user = userEvent.setup();
    render(<PatientsPage />);
    await screen.findByText('Анна Смирнова');

    const rows = screen.getAllByRole('link');
    expect(rows).toHaveLength(2);
    rows[1].focus();
    await user.keyboard('{Enter}');

    expect(pushMock).toHaveBeenCalledWith('/patients/p2');
  });

  it('null-поля legacy: lastSessionAt=null → «—», avgSudsReduction=null → «—»', async () => {
    assignedMock.mockRejectedValueOnce(new Error('404'));
    myPatientsMock.mockResolvedValueOnce([
      { ...legacyPatients[0], lastSessionAt: null, avgSudsReduction: null },
    ]);
    render(<PatientsPage />);

    await screen.findByText('Вера Ли');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
