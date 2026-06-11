/**
 * Spec для lib/trpc.ts (#150) — типизированный tRPC-клиент.
 *
 * Покрывает createTrpcClient: URL из env с fallback, headers() с JWT
 * из localStorage (ключ 'token' согласован с AuthContext и lib/socket).
 */

// Перехватываем фабрики ДО импорта тестируемого модуля
const mockCreateClient = jest.fn();
const mockHttpBatchLink = jest.fn((opts: unknown) => ({ __link: true, opts }));

jest.mock('@trpc/react-query', () => ({
  createTRPCReact: jest.fn(() => ({
    createClient: mockCreateClient,
  })),
}));

jest.mock('@trpc/client', () => ({
  httpBatchLink: (opts: unknown) => mockHttpBatchLink(opts),
}));

describe('lib/trpc (#150)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    mockHttpBatchLink.mockClear();
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('createTrpcClient: использует NEXT_PUBLIC_API_URL когда задан', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    const { createTrpcClient } = require('../trpc');
    createTrpcClient();

    expect(mockHttpBatchLink).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://api.example.com/trpc' }),
    );
  });

  it('createTrpcClient: fallback на localhost:3001 без env', () => {
    const { createTrpcClient } = require('../trpc');
    createTrpcClient();

    expect(mockHttpBatchLink).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://localhost:3001/trpc' }),
    );
  });

  it('headers(): Authorization Bearer из localStorage token', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    const { createTrpcClient } = require('../trpc');
    createTrpcClient();

    const linkOpts = mockHttpBatchLink.mock.calls[0][0] as {
      headers: () => Record<string, string>;
    };
    expect(linkOpts.headers()).toEqual({ Authorization: 'Bearer abc.def.ghi' });
  });

  it('headers(): пустой объект без token', () => {
    const { createTrpcClient } = require('../trpc');
    createTrpcClient();

    const linkOpts = mockHttpBatchLink.mock.calls[0][0] as {
      headers: () => Record<string, string>;
    };
    expect(linkOpts.headers()).toEqual({});
  });

  it('headers() читает token лениво — смена в localStorage видна без пересоздания клиента', () => {
    const { createTrpcClient } = require('../trpc');
    createTrpcClient();
    const linkOpts = mockHttpBatchLink.mock.calls[0][0] as {
      headers: () => Record<string, string>;
    };

    expect(linkOpts.headers()).toEqual({});
    localStorage.setItem('token', 'fresh-token');
    expect(linkOpts.headers()).toEqual({ Authorization: 'Bearer fresh-token' });
  });

  it('createClient вызывается с массивом links из одного httpBatchLink', () => {
    const { createTrpcClient } = require('../trpc');
    createTrpcClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({
        links: [expect.objectContaining({ __link: true })],
      }),
    );
  });

  it('экспортирует trpc (созданный через createTRPCReact)', () => {
    const { trpc } = require('../trpc');
    expect(trpc).toBeDefined();
    expect(trpc.createClient).toBe(mockCreateClient);
  });
});
