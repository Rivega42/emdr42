/**
 * Контракт snapshot.json, который генерирует scripts/dashboard-fetch.mjs.
 * При изменении схемы — синхронизировать с скриптом.
 */
export interface Snapshot {
  generatedAt?: string;
  items: Item[];
  epics?: Epic[];
}

export interface Item {
  id: string;
  number: number;
  title: string;
  url?: string;
  status?: string;
  priority?: string;
  size?: string;
  sprint?: string;
  batch?: string;
  epic?: string;
  stream?: string;
  startDate?: string;
  targetDate?: string;
  progress?: number;
  blockedBy?: string[];
  component?: string;
  labels?: string[];
  state?: 'OPEN' | 'CLOSED';
}

export interface Epic {
  id: string;
  number: number;
  title: string;
  progress: number;
  total: number;
  done: number;
  url?: string;
}
