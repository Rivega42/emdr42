'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { PatientSummary } from '@/lib/types';
import { DataTable } from '@/components/ui/DataTable';

export default function PatientsPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isTherapist = hasRole('THERAPIST') || hasRole('ADMIN');

  useEffect(() => {
    if (!isTherapist) return;
    const load = async () => {
      try {
        const tpData = await api.getAssignedPatients();
        setPatients(
          tpData.items.map((item) => ({
            id: item.patient.id,
            name: item.patient.name,
            email: item.patient.email,
            role: 'PATIENT',
            isActive: true,
            createdAt: item.patient.createdAt,
            updatedAt: item.patient.createdAt,
            sessionsCount: 0,
            lastSessionAt: null,
            avgSudsReduction: null,
          })),
        );
      } catch {
        // Fallback на старый API
        try {
          const data = await api.getMyPatients();
          setPatients(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить пациентов');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTherapist]);

  const filtered = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [patients, search],
  );

  if (!isTherapist) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-20) 0' }}>
        <p className="c-sub" style={{ fontSize: 'var(--text-lg)' }}>Доступ только для терапевтов.</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="c-h1">Мои пациенты</h1>
        <p className="c-sub">Назначенные пациенты и тренд их состояния</p>
      </div>

      <input
        type="text"
        placeholder="Поиск по имени или email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="e-input"
        style={{ maxWidth: 360 }}
        aria-label="Поиск пациентов"
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-20) 0' }} role="status" aria-live="polite">
          <div className="spinner" />
          <span className="sr-only">Загрузка…</span>
        </div>
      ) : error ? (
        <div role="alert" className="p-6 bg-danger-soft border border-danger rounded-lg text-danger">
          {error}
        </div>
      ) : (
        <>
          <DataTable
            columns={[
              { key: 'name', label: 'Имя' },
              { key: 'email', label: 'Email' },
              { key: 'sessions', label: 'Сессий', align: 'center' },
              { key: 'last', label: 'Последняя сессия' },
              { key: 'suds', label: 'ΔSUDS (средн.)', align: 'right' },
            ]}
            rows={filtered.map((p) => ({
              id: p.id,
              name: <strong style={{ fontWeight: 500 }}>{p.name}</strong>,
              email: <span className="is-muted">{p.email}</span>,
              sessions: <span className="is-num">{p.sessionsCount}</span>,
              last: (
                <span className="is-muted">
                  {p.lastSessionAt ? new Date(p.lastSessionAt).toLocaleDateString('ru-RU') : '—'}
                </span>
              ),
              suds:
                p.avgSudsReduction != null ? (
                  <span
                    className="is-num"
                    style={{ color: p.avgSudsReduction > 0 ? 'var(--success)' : p.avgSudsReduction < 0 ? 'var(--warning)' : 'var(--text-muted)' }}
                  >
                    {p.avgSudsReduction > 0 ? '↓' : '↑'}
                    {Math.abs(p.avgSudsReduction).toFixed(1)}
                  </span>
                ) : (
                  <span className="is-muted is-num">—</span>
                ),
            }))}
            onRowClick={(row) => router.push(`/patients/${row.id}`)}
            empty={search ? 'По запросу ничего не найдено' : 'Пациенты пока не назначены'}
          />
          <p className="c-sub">Нажмите на строку, чтобы открыть карточку пациента.</p>
        </>
      )}
    </>
  );
}
