'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
        const data = await api.getMyPatients();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTherapist]);

  const filtered = useMemo(
    () =>
      patients.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [patients, search],
  );

  if (!isTherapist) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-white/70 text-lg">Access restricted to therapists.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">My Patients</h1>
        <p className="text-white/60 mb-8">View and manage your patient list</p>
      </motion.div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
          aria-label="Search patients"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">&#x1F464;</div>
          <p className="text-white/60">
            {search ? 'No patients match your search.' : 'No patients assigned yet.'}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider hidden md:table-cell">
                  Email
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider hidden lg:table-cell">
                  Last Session
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider hidden lg:table-cell">
                  Avg SUDS Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  className="border-b border-white/5 hover:bg-teal-500/10 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-white font-medium">{patient.name}</td>
                  <td className="px-6 py-4 text-white/60 hidden md:table-cell">
                    {patient.email}
                  </td>
                  <td className="px-6 py-4 text-center text-white/80">
                    {patient.sessionsCount}
                  </td>
                  <td className="px-6 py-4 text-white/60 hidden lg:table-cell">
                    {patient.lastSessionAt
                      ? new Date(patient.lastSessionAt).toLocaleDateString()
                      : '\u2014'}
                  </td>
                  <td className="px-6 py-4 text-center hidden lg:table-cell">
                    {patient.avgSudsReduction != null ? (
                      <span
                        className={
                          patient.avgSudsReduction > 0
                            ? 'text-green-400'
                            : patient.avgSudsReduction < 0
                              ? 'text-red-400'
                              : 'text-white/60'
                        }
                      >
                        {patient.avgSudsReduction > 0 ? '-' : '+'}
                        {Math.abs(patient.avgSudsReduction).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-white/40">{'\u2014'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
