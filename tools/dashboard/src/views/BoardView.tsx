import React from 'react';
import type { Snapshot } from '../types';
import { ItemRow } from '../components/ItemRow';

const COLUMNS = ['Backlog', 'Up Next', 'In Progress', 'Review', 'Done'];

export const BoardView: React.FC<{ snapshot: Snapshot }> = ({ snapshot }) => {
  const byStatus = new Map<string, typeof snapshot.items>();
  for (const item of snapshot.items) {
    const status = item.status ?? 'Backlog';
    if (!byStatus.has(status)) byStatus.set(status, []);
    byStatus.get(status)!.push(item);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Канбан</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const items = byStatus.get(col) ?? [];
          return (
            <div key={col} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">{col} <span className="text-gray-400">({items.length})</span></div>
              <div className="space-y-1">
                {items.map((item) => (
                  <ItemRow key={item.id} item={item} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
