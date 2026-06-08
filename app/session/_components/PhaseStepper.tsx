'use client';

import React from 'react';
import { PHASE_META, PHASE_ORDER, type EmdrPhase } from './types';

interface PhaseStepperProps {
  phase: EmdrPhase;
}

export const PhaseStepper = React.memo(function PhaseStepper({ phase }: PhaseStepperProps) {
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  return (
    <div className="flex items-center px-6 py-2 bg-white border-b border-gray-200 gap-1 overflow-x-auto" role="progressbar" aria-valuemin={0} aria-valuemax={PHASE_ORDER.length - 1} aria-valuenow={phaseIndex} aria-label="EMDR phase progress">
      {PHASE_ORDER.map((p, i) => {
        const isCurrent = p === phase;
        const isPast = i < phaseIndex;
        return (
          <React.Fragment key={p}>
            {i > 0 && <div className={`h-px flex-1 min-w-2 ${isPast ? 'bg-gray-900' : 'bg-gray-200'}`} />}
            <div
              aria-current={isCurrent ? 'step' : undefined}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap font-medium transition-colors ${
                isCurrent ? 'bg-gray-900 text-white' : isPast ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {PHASE_META[p].label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
});
