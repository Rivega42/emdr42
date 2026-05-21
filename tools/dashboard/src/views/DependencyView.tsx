import React from 'react';
import type { Snapshot } from '../types';

export const DependencyView: React.FC<{ snapshot: Snapshot }> = ({ snapshot }) => {
  const blocked = snapshot.items.filter((i) => (i.blockedBy ?? []).length > 0);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Зависимости ({blocked.length} заблокировано)</h2>
      {blocked.length === 0 && <div className="text-gray-400">Нет blocked-задач — отлично.</div>}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        {blocked.map((item) => (
          <div key={item.id}>
            <a href={item.url ?? '#'} className="font-semibold hover:underline">
              #{item.number} · {item.title}
            </a>
            <div className="text-xs text-gray-500 mt-1">
              Зависит от: {(item.blockedBy ?? []).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
