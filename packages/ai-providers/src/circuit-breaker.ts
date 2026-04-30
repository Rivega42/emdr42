/**
 * CircuitBreaker — простая реализация circuit breaker pattern для LLM/TTS/STT providers (#116).
 *
 * Состояния:
 *   - CLOSED: нормальная работа, запросы идут напрямую
 *   - OPEN: провайдер помечен как сбойный, запросы немедленно отклоняются
 *   - HALF_OPEN: пробный запрос — если успешен, возвращаемся в CLOSED
 *
 * Transitions:
 *   CLOSED → OPEN: при превышении failureThreshold за failureWindow
 *   OPEN → HALF_OPEN: после halfOpenAfter ms
 *   HALF_OPEN → CLOSED: при успешном probe
 *   HALF_OPEN → OPEN: при неуспешном probe
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number; // default 5
  failureWindowMs: number; // default 60_000
  halfOpenAfterMs: number; // default 30_000
  timeoutMs: number; // default 30_000 — per-request timeout
  name?: string;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is OPEN`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitTimeoutError extends Error {
  constructor(name: string, ms: number) {
    super(`Circuit breaker "${name}" timed out after ${ms}ms`);
    this.name = 'CircuitTimeoutError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private openedAt = 0;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.opts = {
      failureThreshold: 5,
      failureWindowMs: 60_000,
      halfOpenAfterMs: 30_000,
      timeoutMs: 30_000,
      name: 'default',
      ...options,
    };
  }

  getState(): CircuitState {
    this.maybeTransitionFromOpen();
    return this.state;
  }

  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.maybeTransitionFromOpen();

    if (this.state === 'OPEN') {
      throw new CircuitOpenError(this.opts.name);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);

    try {
      const result = await fn(controller.signal);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (controller.signal.aborted) {
        throw new CircuitTimeoutError(this.opts.name, this.opts.timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
    this.failures = [];
  }

  private onFailure(): void {
    const now = Date.now();
    // Отбросить failures старше окна
    this.failures = this.failures.filter(
      (t) => now - t < this.opts.failureWindowMs,
    );
    this.failures.push(now);

    if (this.state === 'HALF_OPEN') {
      this.trip();
    } else if (this.failures.length >= this.opts.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'OPEN';
    this.openedAt = Date.now();
  }

  private maybeTransitionFromOpen(): void {
    if (
      this.state === 'OPEN' &&
      Date.now() - this.openedAt >= this.opts.halfOpenAfterMs
    ) {
      this.state = 'HALF_OPEN';
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = [];
    this.openedAt = 0;
  }
}

/**
 * withRetry — обёртка с exponential backoff. Идёт ПОВЕРХ circuit breaker:
 * retries внутри одного провайдера, если нужен fallback — делает Router.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryable?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 5000;
  const retryable = options.retryable ?? (() => true);

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !retryable(err)) throw err;
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      // Добавляем jitter ±25%
      const jitter = delay * (0.75 + Math.random() * 0.5);
      await new Promise((r) => setTimeout(r, jitter));
    }
  }
  throw lastError;
}
