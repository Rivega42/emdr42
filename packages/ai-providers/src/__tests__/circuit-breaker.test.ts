import {
  CircuitBreaker,
  CircuitOpenError,
  CircuitTimeoutError,
  withRetry,
} from '../circuit-breaker';

describe('CircuitBreaker', () => {
  it('executes successfully in CLOSED state', async () => {
    const cb = new CircuitBreaker({ name: 'test' });
    const result = await cb.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('trips OPEN after failureThreshold failures', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, halfOpenAfterMs: 10000 });
    const failing = async () => {
      throw new Error('boom');
    };
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    await expect(cb.execute(failing)).rejects.toThrow('boom');
    expect(cb.getState()).toBe('OPEN');
    await expect(cb.execute(async () => 'ok')).rejects.toThrow(CircuitOpenError);
  });

  it('transitions OPEN → HALF_OPEN after halfOpenAfterMs', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, halfOpenAfterMs: 20 });
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow();
    expect(cb.getState()).toBe('OPEN');
    await new Promise((r) => setTimeout(r, 30));
    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('HALF_OPEN → CLOSED on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, halfOpenAfterMs: 20 });
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 30));
    const result = await cb.execute(async () => 'probe-ok');
    expect(result).toBe('probe-ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('aborts on timeout', async () => {
    const cb = new CircuitBreaker({ timeoutMs: 20, failureThreshold: 10 });
    await expect(
      cb.execute(() => new Promise((r) => setTimeout(r, 200))),
    ).rejects.toThrow(CircuitTimeoutError);
  });
});

describe('withRetry', () => {
  it('returns on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { maxRetries: 3 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure up to maxRetries', async () => {
    let attempts = 0;
    const fn = () => {
      attempts++;
      if (attempts < 3) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    };
    await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })).resolves.toBe('ok');
    expect(attempts).toBe(3);
  });

  it('honours retryable predicate', async () => {
    const fn = jest.fn(async () => {
      throw new Error('nonRetryable');
    });
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 1, retryable: () => false }),
    ).rejects.toThrow('nonRetryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
