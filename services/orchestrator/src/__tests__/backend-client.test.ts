/**
 * Spec для BackendClient — HTTP-клиент для NestJS API.
 *
 * Проверяет:
 * - правильные пути и методы (POST/PATCH/GET) для каждого эндпоинта
 * - Authorization Bearer header
 * - маппинг EmotionSnapshot → API формат, batch-skip для пустого массива
 * - error handling: бросает с кодом/телом для не-2xx
 * - best-effort пути (recordUsage, gamification) — глотают ошибки
 * - trailing slash в baseUrl нормализуется
 */
import { BackendClient } from '../backend-client';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const ok = (body: unknown = {}) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const fail = (status: number, text: string) => ({
  ok: false,
  status,
  json: async () => ({}),
  text: async () => text,
});

beforeEach(() => mockFetch.mockReset());

describe('BackendClient', () => {
  const client = new BackendClient('http://api.local', 'jwt-token');

  describe('конструктор', () => {
    it('срезает trailing slash в baseUrl', async () => {
      const c = new BackendClient('http://api.local/', 'tok');
      mockFetch.mockResolvedValueOnce(ok({ id: 's' }));
      await c.createSession({});
      expect(mockFetch.mock.calls[0][0]).toBe('http://api.local/sessions');
    });
  });

  describe('createSession', () => {
    it('POST /sessions с телом и Bearer-токеном', async () => {
      mockFetch.mockResolvedValueOnce(ok({ id: 's-1', userId: 'u', status: 'active' }));
      const result = await client.createSession({ targetMemory: 'mem', blsSpeed: 1.2 });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('http://api.local/sessions');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer jwt-token');
      expect(JSON.parse(init.body)).toEqual({ targetMemory: 'mem', blsSpeed: 1.2 });
      expect(result.id).toBe('s-1');
    });

    it('кидает с кодом и текстом при не-2xx', async () => {
      mockFetch.mockResolvedValueOnce(fail(500, 'boom'));
      await expect(client.createSession({})).rejects.toThrow(/500.*boom/);
    });
  });

  describe('updateSession', () => {
    it('PATCH /sessions/:id', async () => {
      mockFetch.mockResolvedValueOnce(ok({ id: 's', status: 'paused' }));
      await client.updateSession('s', { status: 'paused' });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('http://api.local/sessions/s');
      expect(init.method).toBe('PATCH');
    });
  });

  describe('addTimelineEvent', () => {
    it('POST /sessions/:id/timeline с timestamp/type/data', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await client.addTimelineEvent('s', {
        timestamp: 1000,
        type: 'phase_changed',
        data: { from: 'preparation', to: 'desensitization' },
      } as any);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        timestamp: 1000,
        type: 'phase_changed',
        data: { from: 'preparation', to: 'desensitization' },
      });
    });
  });

  describe('addEmotionRecords', () => {
    it('пустой массив → fetch НЕ вызывается (batch-skip)', async () => {
      await client.addEmotionRecords('s', []);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('маппит все поля EmotionSnapshot → API формат', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await client.addEmotionRecords('s', [
        {
          timestamp: 100,
          stress: 0.5,
          engagement: 0.6,
          positivity: 0.7,
          arousal: 0.8,
          valence: 0.3,
          joy: 0.1,
          sadness: 0.2,
          anger: 0.0,
          fear: 0.05,
          confidence: 0.9,
        } as any,
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body[0]).toMatchObject({
        timestamp: 100,
        stress: 0.5,
        engagement: 0.6,
        valence: 0.3,
        joy: 0.1,
        confidence: 0.9,
      });
    });

    it('batch: отправляет все записи в одном POST', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      const records = Array.from({ length: 50 }, (_, i) => ({
        timestamp: i,
        stress: 0.1,
        engagement: 0.5,
        positivity: 0.5,
        arousal: 0.5,
        valence: 0.5,
      })) as any;
      await client.addEmotionRecords('s', records);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toHaveLength(50);
    });
  });

  describe('SUDS / VOC', () => {
    it('addSudsRecord POST /sessions/:id/suds', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await client.addSudsRecord('s', { timestamp: 1, value: 7, context: 'pre' } as any);
      expect(mockFetch.mock.calls[0][0]).toBe('http://api.local/sessions/s/suds');
    });

    it('addVocRecord POST /sessions/:id/voc', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await client.addVocRecord('s', { timestamp: 1, value: 4, context: 'post' } as any);
      expect(mockFetch.mock.calls[0][0]).toBe('http://api.local/sessions/s/voc');
    });
  });

  describe('addSafetyEvent', () => {
    it('POST /sessions/:id/safety с severity и resolved', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await client.addSafetyEvent('s', {
        timestamp: 100,
        type: 'STRESS_CRITICAL',
        severity: 'HIGH',
        actionTaken: 'paused_bls',
        resolved: false,
      } as any);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toMatchObject({
        type: 'STRESS_CRITICAL',
        severity: 'HIGH',
        resolved: false,
      });
    });
  });

  describe('recordUsage — best effort (#130)', () => {
    it('успешный POST → resolve void', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await expect(
        client.recordUsage({ provider: 'anthropic', providerType: 'LLM', inputTokens: 100 }),
      ).resolves.toBeUndefined();
    });

    it('ошибка backend НЕ ломает flow (best effort)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      await expect(
        client.recordUsage({ provider: 'openai', providerType: 'TTS' }),
      ).resolves.toBeUndefined();
    });

    it('5xx ответ НЕ ломает flow', async () => {
      mockFetch.mockResolvedValueOnce(fail(503, 'unavailable'));
      await expect(
        client.recordUsage({ provider: 'p', providerType: 'STT' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('recordCrisisEvent (#147)', () => {
    it('POST /crisis/report с severity и type — бросает при ошибке (не best-effort)', async () => {
      mockFetch.mockResolvedValueOnce(ok({ id: 'crisis-1' }));
      const result = await client.recordCrisisEvent({
        severity: 'CRITICAL',
        type: 'SUICIDE_IDEATION',
        triggerText: 'redacted',
      });
      expect(result).toMatchObject({ id: 'crisis-1' });
    });

    it('CRITICAL crisis: ошибка backend пробрасывается (audit trail обязателен)', async () => {
      mockFetch.mockResolvedValueOnce(fail(500, 'db down'));
      await expect(
        client.recordCrisisEvent({ severity: 'CRITICAL', type: 'PANIC' }),
      ).rejects.toThrow(/500/);
    });
  });

  describe('getPatientContext (#81)', () => {
    it('GET /patient-context/me/prompt с Bearer', async () => {
      mockFetch.mockResolvedValueOnce(ok({ prompt: 'user context...' }));
      const result = await client.getPatientContext();

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('http://api.local/patient-context/me/prompt');
      expect(init.headers.Authorization).toBe('Bearer jwt-token');
      expect(result.prompt).toBe('user context...');
    });

    it('кидает при 404 (нет контекста)', async () => {
      mockFetch.mockResolvedValueOnce(fail(404, 'not found'));
      await expect(client.getPatientContext()).rejects.toThrow(/404/);
    });
  });

  describe('notifyGamificationEvent — best effort (#89)', () => {
    it('успех → void', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await expect(
        client.notifyGamificationEvent({
          type: 'session_completed',
          finalSuds: 2,
          phasesCompleted: 8,
        }),
      ).resolves.toBeUndefined();
    });

    it('ошибка НЕ ломает session-flow', async () => {
      mockFetch.mockRejectedValueOnce(new Error('down'));
      await expect(
        client.notifyGamificationEvent({ type: 'stop_signal' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('HTTP-helpers: безопасность', () => {
    it('Authorization Bearer на всех методах (GET/POST/PATCH)', async () => {
      mockFetch
        .mockResolvedValueOnce(ok({ prompt: '' })) // GET
        .mockResolvedValueOnce(ok({})) // POST
        .mockResolvedValueOnce(ok({ id: 's' })); // PATCH

      await client.getPatientContext();
      await client.addSudsRecord('s', { timestamp: 0, value: 5 } as any);
      await client.updateSession('s', { status: 'completed' });

      for (const call of mockFetch.mock.calls) {
        expect(call[1].headers.Authorization).toBe('Bearer jwt-token');
      }
    });

    it('Content-Type: application/json на POST/PATCH', async () => {
      mockFetch.mockResolvedValueOnce(ok());
      await client.addSudsRecord('s', { timestamp: 0, value: 5 } as any);
      expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    });
  });
});
