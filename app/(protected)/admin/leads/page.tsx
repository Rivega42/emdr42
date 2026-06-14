'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Lead {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  message: string | null;
  assignedTherapistId: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'NEW', label: 'Новые' },
  { value: 'CONTACTED', label: 'Связались' },
  { value: 'QUALIFIED', label: 'Квалифицирован' },
  { value: 'BOOKED', label: 'Записан' },
  { value: 'CONVERTED', label: 'Конвертирован' },
  { value: 'REJECTED', label: 'Отказ' },
  { value: 'SPAM', label: 'Спам' },
];

export default function LeadsPage() {
  const { hasRole } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listLeads(status || undefined)
      .then((r) => setLeads(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [status]);

  if (!hasRole('ADMIN') && !hasRole('THERAPIST')) {
    return <p className="text-ink-muted">Доступ только для администраторов и терапевтов.</p>;
  }

  const updateStatus = async (id: string, newStatus: string) => {
    await api.updateLead(id, { status: newStatus });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Заявки с сайта</h1>
        <Link href="/admin" className="text-sm text-ink-muted hover:text-ink">
          ← Admin
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="status-filter" className="text-sm text-ink-muted">
          Фильтр:
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-line rounded-md text-sm bg-surface"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-ink-muted" role="status">Загрузка…</p>}
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <p className="text-ink-muted">Лидов нет.</p>
      )}

      {!loading && leads.length > 0 && (
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-ink-muted text-left">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-line">
                  <td className="px-4 py-3 text-ink font-medium">{lead.email}</td>
                  <td className="px-4 py-3 text-ink-muted">{lead.name || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{lead.source || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="px-2 py-1 border border-line rounded text-xs"
                    >
                      {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
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
