'use client';

import React from 'react';

interface SudsVocControlsProps {
  suds: number;
  voc: number;
  onSudsChange: (v: number) => void;
  onVocChange: (v: number) => void;
  onSudsSubmit: () => void;
  onVocSubmit: () => void;
}

export const SudsVocControls = React.memo(function SudsVocControls({
  suds,
  voc,
  onSudsChange,
  onVocChange,
  onSudsSubmit,
  onVocSubmit,
}: SudsVocControlsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <label htmlFor="suds-input" className="text-gray-400 text-xs block mb-1">
          Rate your distress (SUDS 0-10)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="suds-input"
            type="range"
            min="0"
            max="10"
            step="1"
            value={suds}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={suds}
            onChange={(e) => onSudsChange(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-gray-900 font-mono w-6 text-center" aria-live="polite">{suds}</span>
          <button
            onClick={onSudsSubmit}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="voc-input" className="text-gray-400 text-xs block mb-1">
          How true does this feel? (VOC 1-7)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="voc-input"
            type="range"
            min="1"
            max="7"
            step="1"
            value={voc}
            aria-valuemin={1}
            aria-valuemax={7}
            aria-valuenow={voc}
            onChange={(e) => onVocChange(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-gray-900 font-mono w-6 text-center" aria-live="polite">{voc}</span>
          <button
            onClick={onVocSubmit}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
});
