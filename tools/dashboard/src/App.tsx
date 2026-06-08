import React, { useEffect, useState } from 'react';
import { RoadmapView } from './views/RoadmapView';
import { BacklogView } from './views/BacklogView';
import { BoardView } from './views/BoardView';
import { EpicsView } from './views/EpicsView';
import { DependencyView } from './views/DependencyView';
import type { Snapshot } from './types';

type ViewKey = 'roadmap' | 'backlog' | 'board' | 'epics' | 'deps';

const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'board', label: 'Board' },
  { key: 'epics', label: 'Эпики' },
  { key: 'deps', label: 'Зависимости' },
];

export const App: React.FC = () => {
  const [view, setView] = useState<ViewKey>('roadmap');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./data/snapshot.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSnapshot)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить snapshot'));
  }, []);

  const updatedAt = snapshot?.generatedAt
    ? new Date(snapshot.generatedAt).toLocaleString('ru-RU')
    : '—';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">EMDR-AI · Roadmap</h1>
            <div className="text-xs text-gray-500">Снимок: {updatedAt}</div>
          </div>
          <nav className="flex gap-1">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === v.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {v.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
            {error}. Запустите <code>node scripts/dashboard-fetch.mjs</code>, чтобы создать <code>tools/dashboard/data/snapshot.json</code>.
          </div>
        )}
        {!snapshot && !error && <div className="text-gray-500">Загрузка…</div>}
        {snapshot && view === 'roadmap' && <RoadmapView snapshot={snapshot} />}
        {snapshot && view === 'backlog' && <BacklogView snapshot={snapshot} />}
        {snapshot && view === 'board' && <BoardView snapshot={snapshot} />}
        {snapshot && view === 'epics' && <EpicsView snapshot={snapshot} />}
        {snapshot && view === 'deps' && <DependencyView snapshot={snapshot} />}
      </main>
    </div>
  );
};
