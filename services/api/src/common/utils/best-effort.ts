import { Logger } from '@nestjs/common';

const logger = new Logger('BestEffort');

/**
 * Fire-and-forget wrapper: выполняет async операцию, глотает ошибки,
 * логирует их с label для debug trace.
 *
 * Использование вместо silent `.catch(() => void 0)`.
 */
export async function bestEffort<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(
      `best-effort [${label}] failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}
