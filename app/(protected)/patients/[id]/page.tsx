'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { User, Session } from '@/lib/types';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [patient, setPatient] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTherapist = hasRole('THERAPIST') || hasRole('ADMIN');

  useEffect(() => {
    if (!isTherapist || !id) return;
    const load = async () => {
      try {
        const [sessionsRes, patientsRes] = await Promise.all([
          api.getPatientSessions(id),
          api.getMyPatients(),
        ]);
        const patientsList: any[] = (patientsRes as any).data || patientsRes || [];
        const found = patientsList.find((p: any) => p.id === id);
        if (found) setPatient(found);
        const sessionsList: Session[] = (sessionsRes as any).data || sessionsRes || [];
        setSessions(sessionsList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTherapist, id]);

  if (!isTherapist) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-white/70 text-lg">Access restricted to therapists.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const avgSudsReduction =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => {
          if (s.sudsStart != null && s.sudsEnd != null) return sum + (s.sudsStart - s.sudsEnd);
          return sum;
        }, 0) / completedSessions.length
      : null;

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-300',
    active: 'bg-blue-500/20 text-blue-300',
    paused: 'bg-yellow-500/20 text-yellow-300',
    aborted: 'bg-red-500/20 text-red-300',
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        href="/patients"
        className="inline-flex items-center text-teal-300 hover:text-teal-200 mb-6 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </Link>

      {/* Patient header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{patient?.name || 'Patient'}</h1>
            <p className="text-white/60">{patient?.email}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-teal-300">{sessions.length}</div>
              <div className="text-xs text-white/50 uppercase">Sessions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-300">
                {avgSudsReduction != null ? avgSudsReduction.toFixed(1) : '\u2014'}
              </div>
              <div className="text-xs text-white/50 uppercase">Avg SUDS Reduction</div>
            </div>
            <div>
              <div className="text-sm font-medium text-white/70">
                {patient?.createdAt
                  ? new Date(patient.createdAt).toLocaleDateString()
                  : '\u2014'}
              </div>
              <div className="text-xs text-white/50 uppercase">Member Since</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Session history */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Session History</h2>

        {sessions.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 text-center">
            <p className="text-white/60">No sessions recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider hidden md:table-cell">
                    Duration
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider hidden md:table-cell">
                    Pattern
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider">
                    SUDS
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-teal-300 uppercase tracking-wider hidden lg:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() =>
                      router.push(`/patients/${id}/sessions/${session.id}`)
                    }
                    className="border-b border-white/5 hover:bg-teal-500/10 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-white">
                      {new Date(session.startedAt).toLocaleDateString()}{' '}
                      <span className="text-white/50 text-sm">
                        {new Date(session.startedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-white/70 hidden md:table-cell">
                      {session.durationMinutes != null
                        ? `${session.durationMinutes} min`
                        : '\u2014'}
                    </td>
                    <td className="px-6 py-4 text-white/70 hidden md:table-cell">
                      {session.blsPattern}
                    </td>
                    <td className="px-6 py-4 text-center text-white/80">
                      {session.sudsStart != null && session.sudsEnd != null
                        ? `${session.sudsStart} \u2192 ${session.sudsEnd}`
                        : '\u2014'}
                    </td>
                    <td className="px-6 py-4 text-center hidden lg:table-cell">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          statusColors[session.status] || 'bg-white/10 text-white/70'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
