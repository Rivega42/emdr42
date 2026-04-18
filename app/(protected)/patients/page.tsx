'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { PatientSummary } from '@/lib/types';

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
        // Сначала пытаемся через therapist-patient API (реальные assigned patients)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/therapist-patient/patients?pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
            },
          },
        );
        if (res.ok) {
          const tpData = await res.json();
          setPatients(
            tpData.items.map((item: any) => ({
              id: item.patient.id,
              name: item.patient.name,
              email: item.patient.email,
              sessionsCount: 0,
              lastSessionAt: null,
              avgSudsReduction: null,
            })),
          );
        } else {
          // Fallback на старый API
          const data = await api.getMyPatients();
          setPatients(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить пациентов');
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
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-gray-500 text-lg">Доступ только для терапевтов.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои пациенты</h1>
        <p className="text-gray-400">Список назначенных пациентов</p>
      </div>
      <div className="mb-6 flex gap-3 items-center">
        <input
          type="text"
          placeholder="Поиск по имени или email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
          aria-label="Поиск пациентов"
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-600">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4" aria-hidden="true">👤</div>
          <p className="text-gray-400">
            {search ? 'По запросу ничего не найдено' : 'Пациенты пока не назначены'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Имя
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Email
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Сессий
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Последняя сессия
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  ΔSUDS (средн.)
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient, i) => (
                <tr
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(`/patients/${patient.id}`);
                  }}
                  tabIndex={0}
                  role="link"
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    i % 2 === 1 ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-gray-900 font-medium">{patient.name}</td>
                  <td className="px-6 py-4 text-gray-400 hidden md:table-cell">{patient.email}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{patient.sessionsCount}</td>
                  <td className="px-6 py-4 text-gray-400 hidden lg:table-cell">
                    {patient.lastSessionAt
                      ? new Date(patient.lastSessionAt).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-center hidden lg:table-cell">
                    {patient.avgSudsReduction != null ? (
                      <span
                        className={
                          patient.avgSudsReduction > 0
                            ? 'text-green-600'
                            : patient.avgSudsReduction < 0
                              ? 'text-red-600'
                              : 'text-gray-400'
                        }
                      >
                        {patient.avgSudsReduction > 0 ? '↓' : '↑'}
                        {Math.abs(patient.avgSudsReduction).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
