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
    const load = async () => { try { const data = await api.getMyPatients(); setPatients(data); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load patients'); } finally { setLoading(false); } };
    load();
  }, [isTherapist]);

  const filtered = useMemo(() => patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())), [patients, search]);

  if (!isTherapist) return <div className="max-w-7xl mx-auto text-center py-20"><p className="text-gray-500 text-lg">Access restricted to therapists.</p></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-bold text-gray-900 mb-2">My Patients</h1><p className="text-gray-400 mb-8">View and manage your patient list</p></div>
      <div className="mb-6"><input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-md px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" aria-label="Search patients" /></div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center"><div className="text-4xl mb-4">&#x1F464;</div><p className="text-gray-400">{search ? 'No patients match your search.' : 'No patients assigned yet.'}</p></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200"><th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th><th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th><th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions</th><th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Session</th><th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Avg SUDS Trend</th></tr></thead>
            <tbody>
              {filtered.map((patient, i) => (
                <tr key={patient.id} onClick={() => router.push(`/patients/${patient.id}`)} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 text-gray-900 font-medium">{patient.name}</td>
                  <td className="px-6 py-4 text-gray-400 hidden md:table-cell">{patient.email}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{patient.sessionsCount}</td>
                  <td className="px-6 py-4 text-gray-400 hidden lg:table-cell">{patient.lastSessionAt ? new Date(patient.lastSessionAt).toLocaleDateString() : '\u2014'}</td>
                  <td className="px-6 py-4 text-center hidden lg:table-cell">{patient.avgSudsReduction != null ? (<span className={patient.avgSudsReduction > 0 ? 'text-green-600' : patient.avgSudsReduction < 0 ? 'text-red-600' : 'text-gray-400'}>{patient.avgSudsReduction > 0 ? '-' : '+'}{Math.abs(patient.avgSudsReduction).toFixed(1)}</span>) : (<span className="text-gray-300">{'\u2014'}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
