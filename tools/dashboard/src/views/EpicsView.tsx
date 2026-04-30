import React from 'react';
import type { Snapshot } from '../types';

export const EpicsView: React.FC<{ snapshot: Snapshot }> = ({ snapshot }) => {
  const epics = snapshot.epics ?? [];
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Эпики ({epics.length})</h2>
      {epics.length === 0 && <div className="text-gray-400">Нет данных. Запустите rollup.</div>}
      <div className="space-y-3">
        {epics.map((epic) => {
          const pct = Math.round((epic.progress ?? 0) * 100);
          return (
            <div key={epic.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <a href={epic.url ?? '#'} className="font-semibold hover:underline">
                  #{epic.number} · {epic.title}
                </a>
                <span className="text-sm text-gray-500">{epic.done}/{epic.total}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
