import React from 'react';
import type { Snapshot } from '../types';
import { ItemRow } from '../components/ItemRow';

export const BacklogView: React.FC<{ snapshot: Snapshot }> = ({ snapshot }) => {
  const backlog = snapshot.items.filter((i) => !i.sprint && i.state === 'OPEN');
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Backlog ({backlog.length})</h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-1">
        {backlog.length === 0 && <div className="text-gray-400">Пусто.</div>}
        {backlog.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
