'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { formatTime } from './types';

interface EmotionHeaderProps {
  stress: number;
  engagement: number;
  emotionLabel: string;
  elapsed: number;
}

export const EmotionHeader = React.memo(function EmotionHeader({
  stress,
  engagement,
  emotionLabel,
  elapsed,
}: EmotionHeaderProps) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 sm:gap-6 px-3 sm:px-6 py-2 bg-white border-b border-gray-200 text-sm overflow-x-auto" role="banner">
      <button
        onClick={() => router.push('/')}
        className="text-gray-400 hover:text-gray-900 transition-colors shrink-0 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Вернуться на главную"
      >
        &larr;
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-gray-400 hidden sm:inline">Stress</span>
        <span className="text-gray-400 sm:hidden text-xs">S</span>
        <div
          className="w-16 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden"
          role="meter"
          aria-label="Stress level"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={stress}
        >
          <div className="h-full bg-red-500 transition-all" style={{ width: `${stress * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-gray-400 hidden sm:inline">Engagement</span>
        <span className="text-gray-400 sm:hidden text-xs">E</span>
        <div
          className="w-16 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden"
          role="meter"
          aria-label="Engagement level"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={engagement}
        >
          <div className="h-full bg-green-500 transition-all" style={{ width: `${engagement * 100}%` }} />
        </div>
      </div>
      <span className="text-gray-500 shrink-0">{emotionLabel}</span>
      <span className="text-gray-400 ml-auto shrink-0" aria-label={`Elapsed ${formatTime(elapsed)}`}>
        {formatTime(elapsed)}
      </span>
    </header>
  );
});
