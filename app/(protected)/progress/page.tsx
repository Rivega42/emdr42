'use client';

import React, { useEffect, useState } from 'react';

interface SessionSummary {
  id: string;
  sessionNumber: number;
  sudsBaseline: number | null;
  sudsFinal: number | null;
  vocBaseline: number | null;
  vocFinal: number | null;
  durationSeconds: number | null;
  status: string;
  createdAt: string;
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const user = await res.json();

        const sessionsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${user.id}/sessions?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setSessions(data.data || []);
        }
      } catch {
        // API unavailable
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const totalTime = completedSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const sudsDrops = completedSessions
    .filter((s) => s.sudsBaseline != null && s.sudsFinal != null)
    .map((s) => (s.sudsBaseline as number) - (s.sudsFinal as number));
  const avgDrop = sudsDrops.length > 0
    ? (sudsDrops.reduce((a, b) => a + b, 0) / sudsDrops.length).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress</h1>
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Progress</h1>
        <p className="text-gray-500 mb-8">Track your therapy journey</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-600">{completedSessions.length}</div>
          <div className="text-sm text-gray-500">Total Sessions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-600">
            {totalTime > 0 ? `${Math.round(totalTime / 60)}m` : '—'}
          </div>
          <div className="text-sm text-gray-500">Total Time</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{avgDrop}</div>
          <div className="text-sm text-gray-500">Avg SUDS Reduction</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">
            {completedSessions.length > 0 ? completedSessions.length : '—'}
          </div>
          <div className="text-sm text-gray-500">Current Streak</div>
        </div>
      </div>

      {/* SUDS trend visualization */}
      {completedSessions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SUDS Trend</h2>
          <div className="flex items-end gap-2 h-40">
            {completedSessions.slice(-15).map((s, i) => {
              const baseline = s.sudsBaseline ?? 0;
              const final_ = s.sudsFinal ?? 0;
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-0.5">
                    <div
                      className="w-full bg-red-200 rounded-t"
                      style={{ height: `${baseline * 14}px` }}
                      title={`Baseline: ${baseline}`}
                    />
                    <div
                      className="w-full bg-green-400 rounded-b"
                      style={{ height: `${final_ * 14}px` }}
                      title={`Final: ${final_}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">#{s.sessionNumber}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded" /> Baseline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded" /> Final</span>
          </div>
        </div>
      )}

      {/* Session history table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 p-6 pb-4">Session History</h2>
        {sessions.length === 0 ? (
          <div className="text-gray-400 text-center py-12 px-6">
            Complete your first session to see progress.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">#</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Duration</th>
                <th className="px-6 py-3 text-left">SUDS</th>
                <th className="px-6 py-3 text-left">VOC</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{s.sessionNumber}</td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}m` : '—'}
                  </td>
                  <td className="px-6 py-3">
                    {s.sudsBaseline != null && s.sudsFinal != null
                      ? `${s.sudsBaseline} → ${s.sudsFinal}`
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    {s.vocBaseline != null && s.vocFinal != null
                      ? `${s.vocBaseline} → ${s.vocFinal}`
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      s.status === 'ABORTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
