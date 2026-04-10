'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { SessionDetail, TimelineEvent } from '@/lib/types';

const eventIcons: Record<string, string> = {
  ai_message: '\uD83E\uDD16',
  patient_message: '\uD83D\uDCAC',
  bls_started: '\u25B6\uFE0F',
  bls_stopped: '\u23F8\uFE0F',
  phase_changed: '\uD83D\uDD04',
  safety_alert: '\uD83D\uDEA8',
  suds_recorded: '\uD83D\uDCCA',
  voc_recorded: '\uD83D\uDCDD',
};

const stressColor = (stress: number): string => {
  if (stress < 0.3) return 'bg-green-500';
  if (stress < 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function SessionReviewPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const { hasRole } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isTherapist = hasRole('THERAPIST') || hasRole('ADMIN');

  useEffect(() => {
    if (!isTherapist || !sessionId) return;
    const load = async () => {
      try {
        const data = await api.getSessionDetail(sessionId);
        setSession(data);
        setNotes(data.therapistNotes || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTherapist, sessionId]);

  const saveNotes = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await api.updateSessionNotes(sessionId, notes);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [sessionId, notes]);

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

  if (error || !session) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300">
          {error || 'Session not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        href={`/patients/${id}`}
        className="inline-flex items-center text-teal-300 hover:text-teal-200 mb-6 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Patient
      </Link>

      {/* Session metadata */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-8"
      >
        <h1 className="text-2xl font-bold text-white mb-4">Session Review</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-white/50 uppercase mb-1">Date</div>
            <div className="text-white">
              {new Date(session.startedAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50 uppercase mb-1">Duration</div>
            <div className="text-white">
              {session.durationMinutes != null ? `${session.durationMinutes} min` : '\u2014'}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50 uppercase mb-1">Pattern</div>
            <div className="text-white">{session.blsPattern}</div>
          </div>
          <div>
            <div className="text-xs text-white/50 uppercase mb-1">Status</div>
            <div className="text-white capitalize">{session.status}</div>
          </div>
        </div>

        {/* Phase progression */}
        {session.phases.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-white/50 uppercase mb-2">Phase Progression</div>
            <div className="flex flex-wrap gap-2">
              {session.phases.map((phase, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-sm"
                >
                  {phase.phase}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Timeline</h2>
          <div className="space-y-0">
            {session.timeline.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-8 text-center text-white/60">
                No timeline events recorded.
              </div>
            ) : (
              session.timeline.map((event, i) => (
                <TimelineItem key={event.id} event={event} isLast={i === session.timeline.length - 1} />
              ))
            )}
          </div>
        </motion.div>

        {/* Right column: SUDS/VOC + Emotions + Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* SUDS/VOC */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">SUDS / VOC</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-white/50 uppercase mb-1">SUDS (Distress)</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-red-400">
                    {session.sudsStart ?? '\u2014'}
                  </span>
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="text-2xl font-bold text-green-400">
                    {session.sudsEnd ?? '\u2014'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase mb-1">VOC (Belief Validity)</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-yellow-400">
                    {session.vocStart ?? '\u2014'}
                  </span>
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="text-2xl font-bold text-green-400">
                    {session.vocEnd ?? '\u2014'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Emotion track */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Emotion Track</h3>
            {session.emotions.length === 0 ? (
              <p className="text-white/50 text-sm">No emotion data recorded.</p>
            ) : (
              <div className="space-y-2">
                {session.emotions.map((em, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-white/40 w-12 shrink-0">
                      {new Date(em.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stressColor(em.stress)}`}
                        style={{ width: `${Math.min(em.stress * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Therapist notes */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Therapist Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
              placeholder="Add your observations..."
              aria-label="Therapist notes"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-3 w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const isSafety = event.type === 'safety_alert';

  return (
    <div className="flex gap-4">
      {/* Vertical line + icon */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
            isSafety ? 'bg-red-500/30 ring-2 ring-red-500/50' : 'bg-white/10'
          }`}
        >
          {eventIcons[event.type] || '\u2022'}
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/10 my-1" />}
      </div>

      {/* Content */}
      <div className={`pb-6 flex-1 ${isSafety ? 'bg-red-500/5 -mx-2 px-2 rounded-lg border border-red-500/20' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-white/40">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
          <span className="text-xs text-white/50 capitalize">
            {event.type.replace(/_/g, ' ')}
          </span>
        </div>
        <p className={`text-sm ${isSafety ? 'text-red-300 font-medium' : 'text-white/80'}`}>
          {event.content}
        </p>
      </div>
    </div>
  );
}
