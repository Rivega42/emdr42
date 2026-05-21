'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type {
  SafetyAlertData,
  InterventionData,
  SessionEndedData,
} from './types';
import { formatTime } from './types';

interface OverlaysProps {
  safetyAlert: SafetyAlertData | null;
  intervention: InterventionData | null;
  sessionSummary: SessionEndedData | null;
  onAckSafety: () => void;
  onAckIntervention: () => void;
}

export function Overlays({
  safetyAlert,
  intervention,
  sessionSummary,
  onAckSafety,
  onAckIntervention,
}: OverlaysProps) {
  const router = useRouter();

  return (
    <>
      <AnimatePresence>
        {safetyAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            role="alertdialog"
            aria-labelledby="safety-alert-title"
            aria-modal="true"
          >
            <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <h2 id="safety-alert-title" className="text-xl font-bold text-red-600 mb-3">
                Safety Alert
              </h2>
              <p className="text-red-500 text-sm mb-2">Risk level: {safetyAlert.riskLevel}</p>
              {safetyAlert.events.map((evt, i) => (
                <p key={i} className="text-gray-600 text-sm">
                  {evt.type}: {evt.actionTaken}
                </p>
              ))}
              <button
                onClick={onAckSafety}
                className="mt-6 w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold transition-colors"
                autoFocus
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intervention && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            role="alertdialog"
            aria-labelledby="intervention-title"
            aria-modal="true"
          >
            <div className="bg-white border border-amber-200 rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <h2 id="intervention-title" className="text-xl font-bold text-amber-700 mb-3">
                Intervention
              </h2>
              <p className="text-gray-700 text-sm mb-4 whitespace-pre-line">
                {intervention.instructions}
              </p>
              <button
                onClick={onAckIntervention}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-semibold transition-colors"
                autoFocus
              >
                I understand
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            role="dialog"
            aria-labelledby="summary-title"
            aria-modal="true"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md mx-4 shadow-lg">
              <h2 id="summary-title" className="text-2xl font-bold text-gray-900 mb-4">
                Session Complete
              </h2>
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <p>Duration: {formatTime(sessionSummary.elapsedSeconds)}</p>
                <p>BLS sets completed: {sessionSummary.blsSetsCompleted}</p>
                <p>Phases completed: {sessionSummary.phasesCompleted}</p>
                {sessionSummary.finalSuds !== null && (
                  <p>Final SUDS: {sessionSummary.finalSuds}/10</p>
                )}
                {sessionSummary.finalVoc !== null && (
                  <p>Final VOC: {sessionSummary.finalVoc}/7</p>
                )}
                {sessionSummary.safetyEventsCount > 0 && (
                  <p className="text-amber-600">
                    Safety events: {sessionSummary.safetyEventsCount}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/progress')}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition-colors"
                >
                  View Progress
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
