/**
 * Shared formatters для UI.
 * Единое место для форматирования времени, цен, дат.
 */

export const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export const formatPrice = (cents: number, currency = 'usd'): string => {
  if (cents === 0) return 'Бесплатно';
  const amount = cents / 100;
  const symbol = currency.toLowerCase() === 'usd' ? '$' : '';
  return `${symbol}${amount.toFixed(0)}/мес`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)} сек`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}ч`;
};

export const formatDate = (d: string | Date): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ru-RU');
};

export const formatDateTime = (d: string | Date): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};
