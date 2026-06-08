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
  /**
   * Опциональное хранилище для shared-state между репликами.
   * Для multi-replica orchestrator подключите Redis-backed
   * implementation (см. ./redis-circuit-store). Без него каждая реплика
   * имеет свой счётчик failures → суммарно N×failureThreshold запросов
   * проходит до открытия (#C4).
   */
  store?: CircuitStateStore;
}

/**
 * Интерфейс для shared circuit-state. Все методы async — Redis-friendly.
 * Default — InMemoryCircuitStateStore (в этом файле).
 */
export interface CircuitStateStore {
  loadState(name: string): Promise<{
    state: CircuitState;
    failures: number[];
    openedAt: number;
  } | null>;
  saveState(
    name: string,
    s: { state: CircuitState; failures: number[]; openedAt: number },
  ): Promise<void>;
}

export class InMemoryCircuitStateStore implements CircuitStateStore {
  private map = new Map<
    string,
    { state: CircuitState; failures: number[]; openedAt: number }
  >();
  async loadState(name: string) {
    return this.map.get(name) ?? null;
  }
  async saveState(
    name: string,
    s: { state: CircuitState; failures: number[]; openedAt: number },
  ) {
    this.map.set(name, s);
  }
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

const sharedStore = new InMemoryCircuitStateStore();

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private openedAt = 0;
  private readonly opts: Required<Omit<CircuitBreakerOptions, 'store'>>;
  private readonly store: CircuitStateStore;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.opts = {
      failureThreshold: 5,
      failureWindowMs: 60_000,
      halfOpenAfterMs: 30_000,
      timeoutMs: 30_000,
      name: 'default',
      ...options,
    };
    this.store = options.store ?? sharedStore;
  }

  getState(): CircuitState {
    this.maybeTransitionFromOpen();
    return this.state;
  }

  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    // Pull-and-merge state из shared store (Redis при multi-replica).
    // Best-effort: ошибка чтения store не должна ломать запрос.
    await this.syncFromStore().catch(() => void 0);
    this.maybeTransitionFromOpen();

    if (this.state === 'OPEN') {
      throw new CircuitOpenError(this.opts.name);
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new CircuitTimeoutError(this.opts.name, this.opts.timeoutMs));
      }, this.opts.timeoutMs);
    });

    try {
      // Race против таймера — если fn не уважает signal (типичный fetch без
      // AbortController), мы всё равно отклоняем через timeoutPromise.
      const result = await Promise.race([fn(controller.signal), timeoutPromise]);
      this.onSuccess();
      await this.persist().catch(() => void 0);
      return result as T;
    } catch (err) {
      this.onFailure();
      await this.persist().catch(() => void 0);
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async syncFromStore(): Promise<void> {
    const s = await this.store.loadState(this.opts.name);
    if (!s) return;
    // Берём более "плохое" состояние — если store считает OPEN, мы тоже OPEN.
    if (s.state === 'OPEN' && this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.openedAt = s.openedAt;
    }
    // Merge failures: union и dedup по timestamp.
    const merged = new Set<number>([...this.failures, ...s.failures]);
    this.failures = Array.from(merged).sort((a, b) => a - b);
    // Cleanup за окном
    const now = Date.now();
    this.failures = this.failures.filter(
      (t) => now - t < this.opts.failureWindowMs,
    );
  }

  private async persist(): Promise<void> {
    await this.store.saveState(this.opts.name, {
      state: this.state,
      failures: this.failures,
      openedAt: this.openedAt,
    });
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
    this.failures = [];
  }

  private onFailure(): void {
    const now = Date.now();
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
