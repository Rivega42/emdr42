'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface CompareData {
  current: { id: string; sessionNumber: number; sudsFinal: number | null; vocFinal: number | null };
  previous: { id: string; sessionNumber: number; sudsFinal: number | null; vocFinal: number | null };
  delta: {
    sudsDelta: number | null;
    vocDelta: number | null;
    avgStressDelta: number | null;
    effectivenessScore: number | null;
  };
}

export default function CompareSessionsPage() {
  const params = useSearchParams();
  const currentId = params.get('current');
  const previousId = params.get('previous');

  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentId || !previousId) {
      setError('Укажите обе сессии в URL: ?current=…&previous=…');
      setLoading(false);
      return;
    }
    api
      .compareSessions(currentId, previousId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, [currentId, previousId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto" role="status">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Сравнение сессий</h1>
        <p className="text-gray-400">Загрузка…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Сравнение сессий</h1>
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error}
        </div>
        <Link href="/progress" className="inline-block mt-4 text-gray-900 hover:underline">
          ← Назад к прогрессу
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/progress" className="text-sm text-gray-500 hover:text-gray-900">
          ← Назад к прогрессу
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Сессия #{data.current.sessionNumber} vs #{data.previous.sessionNumber}
        </h1>
      </div>

      <section className="grid grid-cols-2 gap-6 mb-6">
        <SessionCard label="Предыдущая" data={data.previous} />
        <SessionCard label="Текущая" data={data.current} highlighted />
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Дельта</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DeltaCard
            label="SUDS"
            value={data.delta.sudsDelta}
            positiveIsGood={false}
            format={(v) => v.toFixed(1)}
          />
          <DeltaCard
            label="VOC"
            value={data.delta.vocDelta}
            positiveIsGood={true}
            format={(v) => v.toFixed(1)}
          />
          <DeltaCard
            label="Средний стресс"
            value={data.delta.avgStressDelta}
            positiveIsGood={false}
            format={(v) => v.toFixed(2)}
          />
          <DeltaCard
            label="Эффективность"
            value={data.delta.effectivenessScore}
            positiveIsGood={true}
            format={(v) => `${v}%`}
          />
        </div>
      </section>
    </div>
  );
}

const SessionCard: React.FC<{
  label: string;
  data: CompareData['current'];
  highlighted?: boolean;
}> = ({ label, data, highlighted = false }) => (
  <div
    className={`border rounded-lg p-6 ${
      highlighted ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
    }`}
  >
    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
    <div className="text-2xl font-bold text-gray-900 mb-4">Сессия #{data.sessionNumber}</div>
    <div className="space-y-2 text-sm">
      <div>
        SUDS: <strong>{data.sudsFinal ?? '—'}</strong>/10
      </div>
      <div>
        VOC: <strong>{data.vocFinal ?? '—'}</strong>/7
      </div>
    </div>
  </div>
);

const DeltaCard: React.FC<{
  label: string;
  value: number | null;
  positiveIsGood: boolean;
  format: (v: number) => string;
}> = ({ label, value, positiveIsGood, format }) => {
  if (value == null) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="text-lg text-gray-400">—</div>
      </div>
    );
  }
  const isPositive = value > 0;
  const isImprovement = positiveIsGood ? isPositive : !isPositive;
  const color =
    value === 0
      ? 'text-gray-600'
      : isImprovement
        ? 'text-green-600'
        : 'text-red-600';
  const arrow = value === 0 ? '→' : isPositive ? '↑' : '↓';
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>
        {arrow} {format(Math.abs(value))}
      </div>
    </div>
  );
};
