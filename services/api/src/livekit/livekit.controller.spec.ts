/**
 * Spec для LiveKitController (#54) — выдача WebRTC-токена.
 *
 * До фикса контроллер возвращал base64-JSON заглушку — LiveKit-сервер
 * такой токен отклоняет. Теперь используется @emdr42/livekit
 * (livekit-server-sdk AccessToken): валидный JWT с grant'ами и TTL (#133).
 */
import { LiveKitController } from './livekit.controller';

const decodeSegment = (seg: string) =>
  JSON.parse(Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

describe('LiveKitController (#54)', () => {
  const controller = new LiveKitController();
  const user = { id: 'user-42', name: 'Roman' };

  beforeEach(() => {
    process.env.LIVEKIT_API_KEY = 'test-api-key';
    process.env.LIVEKIT_API_SECRET = 'test-api-secret-32-chars-minimum!!';
  });

  it('возвращает валидный JWT (3 сегмента), а не base64-заглушку', async () => {
    const { token } = await controller.generateToken(user, { sessionId: 'room-1' });

    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    const header = decodeSegment(parts[0]);
    expect(header.alg).toBe('HS256');
  });

  it('JWT содержит identity юзера, room grant и TTL (#133)', async () => {
    const { token } = await controller.generateToken(user, { sessionId: 'room-1' });
    const payload = decodeSegment(token.split('.')[1]);

    expect(payload.sub).toBe('user-42');
    expect(payload.name).toBe('Roman');
    expect(payload.video).toMatchObject({
      room: 'room-1',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    // TTL обязателен: без exp компрометация токена = бессрочный доступ
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600 + 60);
  });

  it('issuer = LIVEKIT_API_KEY', async () => {
    const { token } = await controller.generateToken(user, { sessionId: 'r' });
    const payload = decodeSegment(token.split('.')[1]);
    expect(payload.iss).toBe('test-api-key');
  });

  it('разные сессии → разные room grants', async () => {
    const a = await controller.generateToken(user, { sessionId: 'room-a' });
    const b = await controller.generateToken(user, { sessionId: 'room-b' });

    expect(decodeSegment(a.token.split('.')[1]).video.room).toBe('room-a');
    expect(decodeSegment(b.token.split('.')[1]).video.room).toBe('room-b');
  });
});
