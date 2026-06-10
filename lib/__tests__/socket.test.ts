/**
 * Spec для lib/socket.ts (#150).
 *
 * Тестируем:
 * - singleton: повторный getSocket() возвращает тот же экземпляр (без него
 *   страница сессии при ре-рендере создавала бы НОВЫЙ socket вдобавок
 *   к старому, остающемуся подвешенным)
 * - JWT из localStorage пробрасывается в auth.token (handshake)
 * - URL берётся из NEXT_PUBLIC_WS_URL ?? fallback
 * - disconnectSocket снимает все listeners ДО disconnect (#236 — иначе
 *   старые listeners продолжали бы стрелять после re-mount)
 */

// Перехватываем фабрику io ДО импорта тестируемого модуля.
const mockSocket = {
  removeAllListeners: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
};
const ioMock = jest.fn(() => mockSocket);
jest.mock('socket.io-client', () => ({ io: ioMock, Socket: class {} }));

describe('lib/socket (#150)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSocket.removeAllListeners.mockClear();
    mockSocket.disconnect.mockClear();
    ioMock.mockClear();
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_WS_URL;
  });

  it('getSocket: первый вызов создаёт через io(), второй возвращает singleton', () => {
    const { getSocket } = require('../socket');
    const a = getSocket();
    const b = getSocket();
    expect(a).toBe(b);
    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it('getSocket: использует NEXT_PUBLIC_WS_URL когда задан', () => {
    process.env.NEXT_PUBLIC_WS_URL = 'https://ws.example.com';
    const { getSocket } = require('../socket');
    getSocket();
    expect(ioMock).toHaveBeenCalledWith(
      'https://ws.example.com/session',
      expect.objectContaining({ transports: ['websocket'], autoConnect: false }),
    );
  });

  it('getSocket: fallback на localhost:8002 без env', () => {
    const { getSocket } = require('../socket');
    getSocket();
    expect(ioMock.mock.calls[0][0]).toBe('http://localhost:8002/session');
  });

  it('getSocket: пробрасывает JWT из localStorage в auth.token', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    const { getSocket } = require('../socket');
    getSocket();
    const opts = ioMock.mock.calls[0][1] as { auth: { token: string | null } };
    expect(opts.auth.token).toBe('abc.def.ghi');
  });

  it('getSocket: auth.token = null если в localStorage нет token', () => {
    const { getSocket } = require('../socket');
    getSocket();
    const opts = ioMock.mock.calls[0][1] as { auth: { token: string | null } };
    expect(opts.auth.token).toBeNull();
  });

  it('disconnectSocket: вызывает removeAllListeners ДО disconnect и обнуляет singleton', () => {
    const { getSocket, disconnectSocket } = require('../socket');
    const first = getSocket();
    expect(first).toBe(mockSocket);

    disconnectSocket();

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    // Порядок: removeAllListeners ДО disconnect (#236)
    const removeOrder = mockSocket.removeAllListeners.mock.invocationCallOrder[0];
    const disconnectOrder = mockSocket.disconnect.mock.invocationCallOrder[0];
    expect(removeOrder).toBeLessThan(disconnectOrder);

    // Следующий getSocket → новый io() вызов (singleton сброшен)
    getSocket();
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

  it('disconnectSocket: no-op если getSocket ещё не вызывался', () => {
    const { disconnectSocket } = require('../socket');
    expect(() => disconnectSocket()).not.toThrow();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
