import React from 'react';
import type { Snapshot } from '../types';
import { ItemRow } from '../components/ItemRow';

export const RoadmapView: React.FC<{ snapshot: Snapshot }> = ({ snapshot }) => {
  const bySprint = new Map<string, typeof snapshot.items>();
  for (const item of snapshot.items) {
    const key = item.sprint ?? 'Без спринта';
    if (!bySprint.has(key)) bySprint.set(key, []);
    bySprint.get(key)!.push(item);
  }
  const groups = Array.from(bySprint.entries()).sort();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Roadmap по спринтам</h2>
      {groups.length === 0 && <div className="text-gray-400">Нет данных.</div>}
      {groups.map(([sprint, items]) => (
        <section key={sprint} className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">{sprint} <span className="text-gray-400 text-sm">({items.length})</span></h3>
          <div className="space-y-1">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
