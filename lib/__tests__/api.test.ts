/**
 * Spec для критичной части ApiClient (#150).
 *
 * Фокус — то, что ломалось бы тихо для пользователя:
 * - single-flight refresh при параллельных 401 (без него N запросов
 *   дёргают /auth/refresh N раз, истощая лимит)
 * - retry оригинального запроса после успешной ротации
 * - вызов onSessionExpired когда refresh невозможен
 * - logout best-effort без падения на сетевой ошибке
 * - исключение auth-flow путей из retry-on-401
 */
import { ApiClient } from '../api';

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 0));

interface MockResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  json: () => Promise<unknown>;
}

function jsonResponse(status: number, body: unknown): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    json: async () => body,
  };
}

describe('ApiClient.request — auth/refresh поведение (#150)', () => {
  let originalFetch: typeof fetch | undefined;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
  });

  it('успешный запрос возвращает тело', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = new ApiClient('https://api.test');
    const data = await client.getProfile();
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/auth/profile');
  });

  it('401 → tryRefresh → retry оригинального запроса', async () => {
    const client = new ApiClient('https://api.test');
    client.setToken('expired-access');
    client.setRefreshToken('valid-refresh');

    fetchMock
      // первая попытка getProfile → 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Token expired' }))
      // /auth/refresh → новая пара
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
      )
      // retry getProfile → 200
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1' }));

    const result = await client.getProfile();
    expect(result).toEqual({ id: 'u1' });

    // 3 вызова: 401 → refresh → retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/auth/refresh');

    // Retry использует новый access-токен
    const retryHeaders = (fetchMock.mock.calls[2][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(retryHeaders['Authorization']).toBe('Bearer new-access');
  });

  it('single-flight: 3 параллельных 401 дёргают /auth/refresh только ОДИН раз', async () => {
    const client = new ApiClient('https://api.test');
    client.setRefreshToken('valid-refresh');

    // На каждый запрос пары "401 → 200 после retry" — но refresh шарится.
    // Порядок ответов: 401, 401, 401, refresh, 200, 200, 200.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-a' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 's1' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 's2' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 's3' }));

    const results = await Promise.all([
      client.getProfile(),
      client.getProfile(),
      client.getProfile(),
    ]);

    expect(results).toHaveLength(3);

    // Refresh должен быть ровно один.
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('refresh fail → onSessionExpired callback + бросает 401', async () => {
    const client = new ApiClient('https://api.test');
    client.setRefreshToken('stale');
    const onExpired = jest.fn();
    client.onSessionExpired = onExpired;

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Refresh rejected' }));

    await expect(client.getProfile()).rejects.toMatchObject({ status: 401 });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('refresh success → onTokensUpdated callback с новой парой', async () => {
    const client = new ApiClient('https://api.test');
    client.setRefreshToken('valid');
    const onUpdated = jest.fn();
    client.onTokensUpdated = onUpdated;

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-a', refreshToken: 'new-r' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await client.getProfile();
    expect(onUpdated).toHaveBeenCalledWith({ accessToken: 'new-a', refreshToken: 'new-r' });
  });

  it('без refresh-токена: 401 пробрасывается как ApiError, без вызова /auth/refresh', async () => {
    const client = new ApiClient('https://api.test');
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }));

    await expect(client.getProfile()).rejects.toMatchObject({ status: 401 });
    // Только один вызов — refresh не дёргается без токена.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401 на /auth/login НЕ триггерит refresh-retry', async () => {
    const client = new ApiClient('https://api.test');
    client.setRefreshToken('valid'); // даже если есть, login не должен ретраить

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid creds' }));

    await expect(client.login('a@b.c', 'wrong')).rejects.toMatchObject({ status: 401 });
    // Только один вызов: login. Refresh не дёргается.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('204 (no content) → undefined без JSON-парсинга', async () => {
    const client = new ApiClient('https://api.test');
    const jsonSpy = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: jsonSpy,
    });
    const data = await client.requestAccountDeletion();
    expect(data).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});

describe('ApiClient.logout', () => {
  let originalFetch: typeof fetch | undefined;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
  });

  it('без refresh-токена ничего не отправляет', async () => {
    const client = new ApiClient('https://api.test');
    await client.logout();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('best-effort: сетевая ошибка глотается, не бросает', async () => {
    const client = new ApiClient('https://api.test');
    client.setRefreshToken('r1');
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(client.logout()).resolves.toBeUndefined();
  });

  it('успешный logout отправляет refresh-token серверу', async () => {
    const client = new ApiClient('https://api.test');
    client.setRefreshToken('r1');
    fetchMock.mockResolvedValueOnce(jsonResponse(204, null));
    await client.logout();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'r1' }),
      }),
    );
  });
});
