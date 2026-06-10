/**
 * Spec для lib/offline-db.ts (#150) — IndexedDB обёртка для офлайн-хранения.
 *
 * jsdom не имеет IndexedDB — используем fake-indexeddb с пере-инициализацией
 * для чистого состояния БД на каждый тест.
 *
 * Покрывает write/read/upsert/filter-by-index пути без boolean-индексов.
 * `getUnsyncedSessions` / `getUnsyncedEmotions` отложены до фикса #261
 * (`IDBKeyRange.only(false)` — boolean невалидный IDB key по W3C spec).
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import {
  saveOfflineSession,
  getOfflineSession,
  getUnsyncedSessions,
  saveChatMessage,
  getSessionMessages,
  saveEmotionSnapshot,
  markAsSynced,
} from '../offline-db';

beforeEach(() => {
  // Свежий instance на каждый тест — иначе схема + данные утекают
  (global as any).indexedDB = new IDBFactory();
});

describe('offline-db (#150) — sessions', () => {
  it('saveOfflineSession + getOfflineSession round-trip', async () => {
    const session = {
      id: 's-1',
      startedAt: '2026-06-10T10:00:00Z',
      phase: 'desensitization',
      blsPattern: 'horizontal',
      blsSpeed: 1.2,
      suds: 7,
      voc: 3,
      synced: false,
    };
    await saveOfflineSession(session);
    const got = await getOfflineSession('s-1');
    expect(got).toEqual(session);
  });

  it('getOfflineSession: undefined для несуществующего id', async () => {
    const got = await getOfflineSession('no-such');
    expect(got).toBeUndefined();
  });

  it('saveOfflineSession: повторный put перезаписывает (upsert)', async () => {
    const s1 = {
      id: 's-1',
      startedAt: 't1',
      phase: 'preparation',
      blsPattern: 'h',
      blsSpeed: 1,
      synced: false,
    };
    await saveOfflineSession(s1);
    await saveOfflineSession({ ...s1, phase: 'desensitization' });
    const got = await getOfflineSession('s-1');
    expect(got?.phase).toBe('desensitization');
  });

  it('сохраняет опциональные поля suds/voc корректно', async () => {
    await saveOfflineSession({
      id: 'with-metrics',
      startedAt: 't',
      phase: 'p',
      blsPattern: 'h',
      blsSpeed: 1,
      suds: 5,
      voc: 4,
      synced: false,
    });
    await saveOfflineSession({
      id: 'without-metrics',
      startedAt: 't',
      phase: 'p',
      blsPattern: 'h',
      blsSpeed: 1,
      synced: false,
    });

    const withM = await getOfflineSession('with-metrics');
    const withoutM = await getOfflineSession('without-metrics');
    expect(withM?.suds).toBe(5);
    expect(withM?.voc).toBe(4);
    expect(withoutM?.suds).toBeUndefined();
    expect(withoutM?.voc).toBeUndefined();
  });
});

describe('offline-db (#150) — messages', () => {
  it('saveChatMessage + getSessionMessages фильтрует по sessionId', async () => {
    await saveChatMessage({
      id: 'm-1',
      sessionId: 's-1',
      role: 'ai',
      text: 'Привет',
      timestamp: 't1',
      synced: false,
    });
    await saveChatMessage({
      id: 'm-2',
      sessionId: 's-1',
      role: 'patient',
      text: 'Здравствуйте',
      timestamp: 't2',
      synced: false,
    });
    await saveChatMessage({
      id: 'm-3',
      sessionId: 's-2',
      role: 'ai',
      text: 'Другая сессия',
      timestamp: 't3',
      synced: false,
    });

    const msgs = await getSessionMessages('s-1');
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.id).sort()).toEqual(['m-1', 'm-2']);
  });

  it('getSessionMessages: пустой массив для неизвестного sessionId', async () => {
    expect(await getSessionMessages('no-session')).toEqual([]);
  });

  it('сохраняет обе роли (ai, patient)', async () => {
    await saveChatMessage({
      id: 'ai-1',
      sessionId: 's',
      role: 'ai',
      text: '',
      timestamp: 't',
      synced: false,
    });
    await saveChatMessage({
      id: 'pt-1',
      sessionId: 's',
      role: 'patient',
      text: '',
      timestamp: 't',
      synced: false,
    });
    const msgs = await getSessionMessages('s');
    expect(msgs.map((m) => m.role).sort()).toEqual(['ai', 'patient']);
  });
});

describe('offline-db (#150) — emotions', () => {
  it('saveEmotionSnapshot сохраняет stress + engagement', async () => {
    await saveEmotionSnapshot({
      id: 'e-1',
      sessionId: 's',
      timestamp: '2026-06-10T10:00:00Z',
      stress: 0.6,
      engagement: 0.7,
      synced: false,
    });
    // Прямого read-by-id для emotions нет, поэтому проверяем write не падает
    // (полное покрытие emotions read придёт с #261).
    await expect(
      saveEmotionSnapshot({
        id: 'e-2',
        sessionId: 's',
        timestamp: 't',
        stress: 0,
        engagement: 0,
        synced: false,
      }),
    ).resolves.toBeDefined();
  });
});

describe('offline-db (#150) — markAsSynced', () => {
  it('помечает session как synced=true', async () => {
    await saveOfflineSession({
      id: 's-1',
      startedAt: 't',
      phase: 'p',
      blsPattern: 'h',
      blsSpeed: 1,
      synced: false,
    });
    await markAsSynced('sessions', 's-1');
    const got = await getOfflineSession('s-1');
    expect(got?.synced).toBe(true);
  });

  it('markAsSynced для несуществующего id — no-op (резолвится без ошибки)', async () => {
    await expect(markAsSynced('sessions', 'missing')).resolves.toBeUndefined();
  });

  it('помечает message как synced', async () => {
    await saveChatMessage({
      id: 'm-1',
      sessionId: 's',
      role: 'ai',
      text: 'hi',
      timestamp: 't',
      synced: false,
    });
    await markAsSynced('messages', 'm-1');
    const msgs = await getSessionMessages('s');
    expect(msgs[0].synced).toBe(true);
  });

  it('помечает emotion как synced (без read-by-id, проверка не падает)', async () => {
    await saveEmotionSnapshot({
      id: 'e-1',
      sessionId: 's',
      timestamp: 't',
      stress: 0.5,
      engagement: 0.5,
      synced: false,
    });
    await expect(markAsSynced('emotions', 'e-1')).resolves.toBeUndefined();
  });
});

describe('offline-db (#150) — DB upgrade flow', () => {
  it('первая операция триггерит onupgradeneeded и создаёт все три стора', async () => {
    // Если хотя бы один store отсутствует, последующая операция бросит
    await expect(
      saveOfflineSession({
        id: 's-1',
        startedAt: 't',
        phase: 'p',
        blsPattern: 'h',
        blsSpeed: 1,
        synced: false,
      }),
    ).resolves.toBeDefined();
    await expect(
      saveChatMessage({
        id: 'm-1',
        sessionId: 's-1',
        role: 'ai',
        text: '',
        timestamp: 't',
        synced: false,
      }),
    ).resolves.toBeDefined();
    await expect(
      saveEmotionSnapshot({
        id: 'e-1',
        sessionId: 's-1',
        timestamp: 't',
        stress: 0,
        engagement: 0,
        synced: false,
      }),
    ).resolves.toBeDefined();

    expect(await getOfflineSession('s-1')).toBeDefined();
    expect(await getSessionMessages('s-1')).toHaveLength(1);
  });
});

describe('offline-db (#150) — known bug (#261)', () => {
  it('getUnsyncedSessions: документирует баг IDBKeyRange.only(false) (boolean невалидный IDB key)', async () => {
    await saveOfflineSession({
      id: 's-1',
      startedAt: 't',
      phase: 'p',
      blsPattern: 'h',
      blsSpeed: 1,
      synced: false,
    });
    // По W3C spec boolean не входит в допустимые типы ключей.
    // fake-indexeddb (и Safari/Firefox) кидают DataError, Chromium терпим.
    // Этот тест зафиксирует поведение: после фикса #261 его нужно
    // переписать на ожидание реального массива.
    await expect(getUnsyncedSessions()).rejects.toThrow();
  });
});
