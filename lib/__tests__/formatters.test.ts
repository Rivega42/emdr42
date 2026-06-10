/**
 * Spec для lib/formatters.ts (#150) — общие форматтеры UI.
 *
 * Чистые функции, fast-проверки. Помогают избежать регрессий
 * при коммерческом запуске (цены, длительности сессии в UI).
 */
import { formatTime, formatPrice, formatDuration, formatDate, formatDateTime } from '../formatters';

describe('formatTime (mm:ss таймер сессии)', () => {
  it('форматирует с padStart до 2 цифр', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(125)).toBe('02:05');
  });

  it('обрабатывает большие значения (часы как минуты — целевая семантика)', () => {
    expect(formatTime(3600)).toBe('60:00'); // 1 час = 60 минут
    expect(formatTime(3725)).toBe('62:05'); // 1ч 2мин 5сек
  });

  it('округляет дробные секунды корректно (фикс #257)', () => {
    expect(formatTime(59.4)).toBe('00:59');
    // После фикса #257: округление до разделения на m:s. 59.6 → 60s → 01:00.
    expect(formatTime(59.6)).toBe('01:00');
    // Подобная граница на 1ч 59.6с
    expect(formatTime(3599.6)).toBe('60:00'); // 3600 / 60 = 60 минут
  });
});

describe('formatPrice (цены подписки)', () => {
  it('0 центов → «Бесплатно» (free tier)', () => {
    expect(formatPrice(0)).toBe('Бесплатно');
  });

  it('USD: символ $ перед суммой, /мес', () => {
    expect(formatPrice(999)).toBe('$10/мес');
    expect(formatPrice(2499)).toBe('$25/мес');
  });

  it('default валюта = usd', () => {
    expect(formatPrice(1000)).toMatch(/^\$/);
  });

  it('неизвестная валюта — без символа', () => {
    expect(formatPrice(1000, 'eur')).toBe('10/мес');
  });

  it('USD регистронезависимо', () => {
    expect(formatPrice(1000, 'USD')).toBe('$10/мес');
  });
});

describe('formatDuration (длительность сессии)', () => {
  it('< 60 сек: «N сек»', () => {
    expect(formatDuration(0)).toBe('0 сек');
    expect(formatDuration(45)).toBe('45 сек');
    expect(formatDuration(59)).toBe('59 сек');
  });

  it('60–3599 сек: «N мин»', () => {
    expect(formatDuration(60)).toBe('1 мин');
    expect(formatDuration(120)).toBe('2 мин');
    expect(formatDuration(1800)).toBe('30 мин'); // 30 минут
  });

  it('≥ 3600 сек: «N.Xч» с одним знаком после точки', () => {
    expect(formatDuration(3600)).toBe('1ч');
    expect(formatDuration(5400)).toBe('1.5ч'); // 1.5 часа
    expect(formatDuration(7200)).toBe('2ч');
  });

  it('округляет дробные секунды в «N сек»', () => {
    expect(formatDuration(45.7)).toBe('46 сек');
  });
});

describe('formatDate / formatDateTime (ru-RU локаль)', () => {
  // Используем Z-suffix чтобы дата не зависела от TZ runtime'а.
  it('formatDate: принимает string и Date, возвращает ru-RU короткий формат', () => {
    const s = formatDate('2026-06-10T12:00:00Z');
    // ru-RU: DD.MM.YYYY (зависит от ICU данных Node)
    expect(s).toMatch(/\d{2}\.\d{2}\.\d{4}/);

    const d = formatDate(new Date('2026-06-10T12:00:00Z'));
    expect(d).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('formatDateTime: короткие дата+время', () => {
    const s = formatDateTime('2026-06-10T12:34:00Z');
    // Содержит и дату (DD.MM), и время (HH:MM)
    expect(s).toMatch(/\d{2}\.\d{2}/);
    expect(s).toMatch(/\d{2}:\d{2}/);
  });

  it('formatDateTime принимает Date', () => {
    const d = new Date('2026-06-10T12:34:00Z');
    expect(formatDateTime(d)).toMatch(/\d{2}:\d{2}/);
  });
});
