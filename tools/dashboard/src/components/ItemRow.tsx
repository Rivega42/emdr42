import React from 'react';
import type { Item } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-blue-100 text-blue-700',
  P3: 'bg-gray-100 text-gray-700',
};

export const ItemRow: React.FC<{ item: Item; compact?: boolean }> = ({ item, compact }) => (
  <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2 border-b border-gray-100 last:border-0'}`}>
    {item.priority && (
      <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[item.priority] ?? 'bg-gray-100 text-gray-700'}`}>
        {item.priority}
      </span>
    )}
    <a
      href={item.url ?? '#'}
      className="text-sm hover:underline flex-1 min-w-0 truncate"
      title={item.title}
    >
      <span className="text-gray-400">#{item.number}</span> {item.title}
    </a>
    {item.epic && <span className="text-xs text-gray-400">{item.epic}</span>}
  </div>
);
