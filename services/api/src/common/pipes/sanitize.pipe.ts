import { Injectable, PipeTransform } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const xss = require('xss');

const DEFAULT_WHITELIST = {} as const; // no tags allowed by default

/**
 * Recursively sanitizes all string fields in DTOs (#123).
 *
 * Применяется как global pipe. Удаляет HTML-теги + скрипты.
 * Не трогает числа, boolean, null.
 *
 * Для полей, где HTML разрешён (например, rich notes), использовать @SkipSanitize().
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown): unknown {
    return this.sanitize(value);
  }

  private sanitize(value: unknown, depth = 0): unknown {
    if (depth > 10) return value; // защита от глубокой рекурсии
    if (value == null) return value;
    if (typeof value === 'string') {
      return xss(value, { whiteList: DEFAULT_WHITELIST, stripIgnoreTag: true });
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitize(v, depth + 1));
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.sanitize(obj[key], depth + 1);
      }
      return result;
    }
    return value;
  }
}
