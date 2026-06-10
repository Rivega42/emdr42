/**
 * Spec для lib/audio-bls.ts (#150) — Web Audio контроллер билатеральной
 * стимуляции (bilateral beats для EMDR).
 *
 * jsdom не реализует Web Audio API — мокаем AudioContext / OscillatorNode
 * / GainNode / StereoPannerNode. Проверяем граф соединений, lifecycle
 * (init/start/stop/dispose), переключение beat-частоты и обновление
 * speed без перезапуска animation loop.
 */

// ---- Web Audio мок ----

const makeOscillator = () => ({
  frequency: { value: 0 },
  connect: jest.fn().mockReturnThis(),
  start: jest.fn(),
  stop: jest.fn(),
});

const makeGain = () => ({
  gain: { value: 0 },
  connect: jest.fn().mockReturnThis(),
});

const makePanner = () => ({
  pan: { value: 0 },
  connect: jest.fn().mockReturnThis(),
});

class MockAudioContext {
  public currentTime = 0;
  public destination = { type: 'destination' };
  public closed = false;
  createOscillator = jest.fn(() => makeOscillator());
  createGain = jest.fn(() => makeGain());
  createStereoPanner = jest.fn(() => makePanner());
  close = jest.fn(async () => {
    this.closed = true;
  });
}

let instances: MockAudioContext[] = [];

beforeEach(() => {
  instances = [];
  (global as any).AudioContext = jest.fn(() => {
    const ctx = new MockAudioContext();
    instances.push(ctx);
    return ctx;
  });
  (global as any).requestAnimationFrame = jest.fn((cb: (t: number) => void) => {
    // НЕ выполняем callback автоматически — иначе бесконечный цикл animate().
    // Тесты, проверяющие animate, дёрнут callback вручную через mock.calls.
    return 42;
  });
  (global as any).cancelAnimationFrame = jest.fn();
});

afterEach(() => {
  delete (global as any).AudioContext;
  delete (global as any).requestAnimationFrame;
  delete (global as any).cancelAnimationFrame;
});

// ---- Tests ----

describe('AudioBlsController (#150)', () => {
  it('initialize: создаёт AudioContext, два осциллятора с binaural beat (theta 6Hz)', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();

    expect((global as any).AudioContext).toHaveBeenCalled();
    const ctx = instances[0];
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(ctx.createGain).toHaveBeenCalledTimes(2);
    expect(ctx.createStereoPanner).toHaveBeenCalledTimes(2);

    // Оба осциллятора стартанули
    const oscs = ctx.createOscillator.mock.results.map((r: any) => r.value);
    expect(oscs[0].start).toHaveBeenCalled();
    expect(oscs[1].start).toHaveBeenCalled();

    // Базовая частота 200Hz, правая +6Hz (theta — медитация / EMDR)
    expect(oscs[0].frequency.value).toBe(200);
    expect(oscs[1].frequency.value).toBe(206);

    // Pan: левый -1, правый +1
    const panners = ctx.createStereoPanner.mock.results.map((r: any) => r.value);
    expect(panners[0].pan.value).toBe(-1);
    expect(panners[1].pan.value).toBe(1);

    // gain.value = 0 (тишина до startBilateral)
    const gains = ctx.createGain.mock.results.map((r: any) => r.value);
    expect(gains[0].gain.value).toBe(0);
    expect(gains[1].gain.value).toBe(0);
  });

  it('startBilateral: запускает animation loop с переданной speed', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    ctl.startBilateral(1.5);

    // raf запрошен
    expect((global as any).requestAnimationFrame).toHaveBeenCalled();
  });

  it('startBilateral: повторный вызов — no-op (isPlaying guard)', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    ctl.startBilateral(1.0);
    ((global as any).requestAnimationFrame as jest.Mock).mockClear();
    ctl.startBilateral(2.0);
    expect((global as any).requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('animate: чередует gain между левым и правым каналом (синусоида)', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    const ctx = instances[0];
    const gains = ctx.createGain.mock.results.map((r: any) => r.value);

    ctl.startBilateral(1.0);

    // Извлекаем callback animate из raf-мока и дёргаем при разных currentTime
    const rafMock = (global as any).requestAnimationFrame as jest.Mock;
    const animateFn = rafMock.mock.calls[0][0] as () => void;

    // t=0 → sin(0) = 0 → оба = 0
    ctx.currentTime = 0;
    animateFn();
    expect(gains[0].gain.value).toBe(0);
    expect(gains[1].gain.value).toBe(0);

    // t=0.25 → sin(π/2) = 1 → левый ON, правый OFF
    ctx.currentTime = 0.25;
    animateFn();
    expect(gains[0].gain.value).toBeGreaterThan(0);
    expect(gains[1].gain.value).toBe(0);

    // t=0.75 → sin(3π/2) = -1 → левый OFF, правый ON
    ctx.currentTime = 0.75;
    animateFn();
    expect(gains[0].gain.value).toBe(0);
    expect(gains[1].gain.value).toBeGreaterThan(0);
  });

  it('stopBilateral: cancelAnimationFrame, isPlaying=false, оба gain → 0', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    const ctx = instances[0];
    const gains = ctx.createGain.mock.results.map((r: any) => r.value);

    ctl.startBilateral(1.0);
    // Имитируем что мы в середине цикла — gain ненулевой
    gains[0].gain.value = 0.3;
    gains[1].gain.value = 0.2;

    ctl.stopBilateral();

    expect((global as any).cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(gains[0].gain.value).toBe(0);
    expect(gains[1].gain.value).toBe(0);
  });

  it('updateSpeed: меняет currentSpeed без перезапуска animation loop', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    const ctx = instances[0];
    const gains = ctx.createGain.mock.results.map((r: any) => r.value);

    ctl.startBilateral(1.0);
    const rafMock = (global as any).requestAnimationFrame as jest.Mock;
    const callsBefore = rafMock.mock.calls.length;

    ctl.updateSpeed(2.0);
    expect(rafMock.mock.calls.length).toBe(callsBefore); // raf не дёрнут заново

    // Эффект speed=2 — phase = sin(2π * 2 * 0.125) = sin(π/2) = 1 при t=0.125
    const animateFn = rafMock.mock.calls[0][0] as () => void;
    ctx.currentTime = 0.125;
    animateFn();
    expect(gains[0].gain.value).toBeGreaterThan(0);
  });

  it('setBeatFrequency: меняет правую частоту относительно левой (delta/theta/alpha/beta)', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    const ctx = instances[0];
    const oscs = ctx.createOscillator.mock.results.map((r: any) => r.value);

    ctl.setBeatFrequency('alpha'); // 10Hz
    expect(oscs[1].frequency.value).toBe(oscs[0].frequency.value + 10);

    ctl.setBeatFrequency('beta'); // 20Hz
    expect(oscs[1].frequency.value).toBe(oscs[0].frequency.value + 20);

    ctl.setBeatFrequency('delta'); // 2Hz
    expect(oscs[1].frequency.value).toBe(oscs[0].frequency.value + 2);
  });

  it('dispose: stopBilateral + oscillator.stop + audioContext.close', async () => {
    const { AudioBlsController } = require('../audio-bls');
    const ctl = new AudioBlsController();
    await ctl.initialize();
    const ctx = instances[0];
    const oscs = ctx.createOscillator.mock.results.map((r: any) => r.value);

    ctl.startBilateral(1.0);
    ctl.dispose();

    expect(oscs[0].stop).toHaveBeenCalled();
    expect(oscs[1].stop).toHaveBeenCalled();
    expect(ctx.close).toHaveBeenCalled();
    // После dispose повторный startBilateral — no-op (audioContext = null)
    ctl.startBilateral(1.0);
    expect((global as any).requestAnimationFrame).toHaveBeenCalledTimes(1);
  });
});
