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

// --- Конвертация synced на границе хранилища (#261) ---
// По W3C spec boolean не входит в допустимые типы IDB-ключей
// (number/string/Date/BinaryData/Array), поэтому индекс `synced` хранит 0|1.
// Публичный API остаётся boolean.

type Stored<T extends { synced: boolean }> = Omit<T, 'synced'> & { synced: 0 | 1 };

function toStored<T extends { synced: boolean }>(rec: T): Stored<T> {
  return { ...rec, synced: rec.synced ? 1 : 0 };
}

function fromStored<T extends { synced: boolean }>(rec: Stored<T>): T {
  return { ...rec, synced: rec.synced === 1 } as T;
}

function getUnsynced<T extends { synced: boolean }>(storeName: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const index = tx.objectStore(storeName).index('synced');
        const req = index.getAll(IDBKeyRange.only(0));
        req.onsuccess = () => resolve((req.result as Stored<T>[]).map(fromStored));
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Сессии ---

export function saveOfflineSession(session: OfflineSession): Promise<IDBValidKey> {
  return doTx('sessions', 'readwrite', (store) => store.put(toStored(session)));
}

export function getOfflineSession(id: string): Promise<OfflineSession | undefined> {
  return doTx<Stored<OfflineSession> | undefined>('sessions', 'readonly', (store) =>
    store.get(id),
  ).then((rec) => (rec ? fromStored(rec) : undefined));
}

export function getUnsyncedSessions(): Promise<OfflineSession[]> {
  return getUnsynced<OfflineSession>('sessions');
}

// --- Сообщения ---

export function saveChatMessage(message: OfflineChatMessage): Promise<IDBValidKey> {
  return doTx('messages', 'readwrite', (store) => store.put(toStored(message)));
}

export function getSessionMessages(sessionId: string): Promise<OfflineChatMessage[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const index = tx.objectStore('messages').index('sessionId');
        const req = index.getAll(IDBKeyRange.only(sessionId));
        req.onsuccess = () => resolve((req.result as Stored<OfflineChatMessage>[]).map(fromStored));
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- Эмоции ---

export function saveEmotionSnapshot(snapshot: OfflineEmotionSnapshot): Promise<IDBValidKey> {
  return doTx('emotions', 'readwrite', (store) => store.put(toStored(snapshot)));
}

export function getUnsyncedEmotions(): Promise<OfflineEmotionSnapshot[]> {
  return getUnsynced<OfflineEmotionSnapshot>('emotions');
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
            getReq.result.synced = 1;
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
