'use client';

import React from 'react';
import { PATTERNS, type BlsConfig } from './types';

interface BlsControlsProps {
  blsConfig: BlsConfig;
  onBlsChange: (patch: Partial<BlsConfig>) => void;
  audioEnabled: boolean;
  onAudioToggle: (enabled: boolean) => void;
  blsColor: string;
  onBlsColorChange: (color: string) => void;
}

export const BlsControls = React.memo(function BlsControls({
  blsConfig,
  onBlsChange,
  audioEnabled,
  onAudioToggle,
  blsColor,
  onBlsColorChange,
}: BlsControlsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label htmlFor="bls-pattern" className="text-gray-400 text-xs">Pattern</label>
        <select
          id="bls-pattern"
          value={blsConfig.pattern}
          onChange={(e) => onBlsChange({ pattern: e.target.value })}
          className="bg-white border border-gray-300 text-gray-900 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-gray-900"
        >
          {PATTERNS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="bls-speed" className="text-gray-400 text-xs">Speed</label>
        <input
          id="bls-speed"
          type="range"
          min="0.3"
          max="2.0"
          step="0.1"
          value={blsConfig.speed}
          aria-valuemin={0.3}
          aria-valuemax={2.0}
          aria-valuenow={blsConfig.speed}
          aria-valuetext={`${blsConfig.speed.toFixed(1)}x`}
          onChange={(e) => onBlsChange({ speed: parseFloat(e.target.value) })}
          className="w-20"
        />
        <span className="text-gray-500 text-xs w-8">{blsConfig.speed.toFixed(1)}x</span>
      </div>
      <label className="flex items-center gap-2 text-gray-500 text-xs">
        <input
          type="checkbox"
          checked={audioEnabled}
          onChange={(e) => onAudioToggle(e.target.checked)}
          className="w-3.5 h-3.5"
        />
        Bilateral Audio
      </label>
      <div className="flex items-center gap-2">
        <label htmlFor="bls-color" className="text-gray-400 text-xs">Color</label>
        <input
          id="bls-color"
          type="color"
          value={blsColor}
          onChange={(e) => onBlsColorChange(e.target.value)}
          className="w-8 h-6 rounded cursor-pointer"
        />
      </div>
    </div>
  );
});
