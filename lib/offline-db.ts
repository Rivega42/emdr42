/**
 * IndexedDB обёртка для офлайн-хранения данных EMDR-сессий.
 * Используется для сохранения прогресса при потере соединения.
 * Без внешних зависимостей — чистый IDB API.
 */

const DB_NAME = 'emdr42';
const DB_VERSION = 1;

interface OfflineSession {
  id: string;
  startedAt: string;
  phase: string;
  blsPattern: string;
  blsSpeed: number;
  suds?: number;
  voc?: number;
  synced: boolean;
}

interface OfflineChatMessage {
  id: string;
  sessionId: string;
  role: 'ai' | 'patient';
  text: string;
  timestamp: string;
  synced: boolean;
}

interface OfflineEmotionSnapshot {
  id: string;
  sessionId: string;
  timestamp: string;
  stress: number;
  engagement: number;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('sessions')) {
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('synced', 'synced');
      }

      if (!db.objectStoreNames.contains('messages')) {
        const messages = db.createObjectStore('messages', { keyPath: 'id' });
        messages.createIndex('sessionId', 'sessionId');
        messages.createIndex('synced', 'synced');
      }

      if (!db.objectStoreNames.contains('emotions')) {
        const emotions = db.createObjectStore('emotions', { keyPath: 'id' });
        emotions.createIndex('sessionId', 'sessionId');
        emotions.createIndex('synced', 'synced');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function doTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Сессии ---

export function saveOfflineSession(session: OfflineSession): Promise<IDBValidKey> {
  return doTx('sessions', 'readwrite', (store) => store.put(session));
}

export function getOfflineSession(id: string): Promise<OfflineSession | undefined> {
  return doTx('sessions', 'readonly', (store) => store.get(id));
}

export function getUnsyncedSessions(): Promise<OfflineSession[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const index = tx.objectStore('sessions').index('synced');
        const req = index.getAll(IDBKeyRange.only(false));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Сообщения ---

export function saveChatMessage(message: OfflineChatMessage): Promise<IDBValidKey> {
  return doTx('messages', 'readwrite', (store) => store.put(message));
}

export function getSessionMessages(sessionId: string): Promise<OfflineChatMessage[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const index = tx.objectStore('messages').index('sessionId');
        const req = index.getAll(IDBKeyRange.only(sessionId));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Эмоции ---

export function saveEmotionSnapshot(snapshot: OfflineEmotionSnapshot): Promise<IDBValidKey> {
  return doTx('emotions', 'readwrite', (store) => store.put(snapshot));
}

export function getUnsyncedEmotions(): Promise<OfflineEmotionSnapshot[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('emotions', 'readonly');
        const index = tx.objectStore('emotions').index('synced');
        const req = index.getAll(IDBKeyRange.only(false));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Синхронизация ---

export function markAsSynced(storeName: string, id: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            getReq.result.synced = true;
            const putReq = store.put(getReq.result);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          } else {
            resolve();
          }
        };
        getReq.onerror = () => reject(getReq.error);
      }),
  );
}
