export function formatTimeHM(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }
  const str = String(value);
  return str.length >= 5
      ? str.slice(0, 5)
      : str;
}

export function formatTimestampToSeconds(timestamp: string): string {
  return timestamp.replace(/\.\d+(?=(?:Z|[+-]\d{2}:?\d{2})?$)/, '');
}

export function formatDateTimeToSeconds(value: unknown, fallback = ''): string {
  const date = new Date(typeof value === 'string' || typeof value === 'number' ? value : Number.NaN);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(date);
}
