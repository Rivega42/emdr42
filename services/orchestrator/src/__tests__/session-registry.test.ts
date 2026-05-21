import { SessionRegistry } from '../session-registry';
import type { SessionHandler } from '../session-handler';
import type { VoiceHandler } from '../voice-handler';

const makeSessionHandler = () =>
  ({
    endSession: jest.fn().mockResolvedValue(undefined),
  } as unknown as SessionHandler);

const makeVoiceHandler = () =>
  ({
    stop: jest.fn(),
  } as unknown as VoiceHandler);

describe('SessionRegistry', () => {
  it('tracks sessions per socket and only evicts the disconnected socket', () => {
    const reg = new SessionRegistry();
    const h1 = makeSessionHandler();
    const h2 = makeSessionHandler();
    reg.addSession('s1', { handler: h1, socketId: 'sock-a', userId: 'u1' });
    reg.addSession('s2', { handler: h2, socketId: 'sock-b', userId: 'u2' });

    expect(reg.sessionsBySocket('sock-a')).toEqual(['s1']);
    expect(reg.sessionsBySocket('sock-b')).toEqual(['s2']);

    reg.removeSession('s1');
    expect(reg.hasSession('s1')).toBe(false);
    expect(reg.hasSession('s2')).toBe(true);
    expect(reg.sessionsBySocket('sock-a')).toEqual([]);
  });

  it('getSession refreshes lastActivity', () => {
    const reg = new SessionRegistry(50, 10);
    reg.addSession('s1', { handler: makeSessionHandler(), socketId: 'sock-a', userId: 'u1' });
    const before = reg.size();
    reg.getSession('s1');
    expect(before.sessions).toBe(1);
  });

  it('sweep evicts idle sessions past timeout', async () => {
    const reg = new SessionRegistry(20, 5);
    const handler = makeSessionHandler();
    reg.addSession('s1', { handler, socketId: 'sock-a', userId: 'u1' });
    reg.startSweeper();
    await new Promise((r) => setTimeout(r, 40));
    expect(handler.endSession).toHaveBeenCalled();
    reg.stopSweeper();
  });

  it('tracks voice handlers by socket', () => {
    const reg = new SessionRegistry();
    const v1 = makeVoiceHandler();
    const v2 = makeVoiceHandler();
    reg.addVoice('s1', { handler: v1, socketId: 'sock-a' });
    reg.addVoice('s2', { handler: v2, socketId: 'sock-b' });

    expect(reg.voiceBySocket('sock-a')).toEqual(['s1']);
    reg.removeVoice('s1');
    expect(reg.getVoice('s1')).toBeUndefined();
    expect(reg.getVoice('s2')).toBeDefined();
  });
});
