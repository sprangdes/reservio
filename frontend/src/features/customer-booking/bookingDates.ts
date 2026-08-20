const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^(\d{2}):(\d{2})(?::\d{2})?$/;

type DateParts = Readonly<{ year: number; month: number; day: number }>;

function parseLocalDate(value: unknown): DateParts | null {
  if (typeof value !== 'string') return null;
  const match = LOCAL_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day
    ? { year, month, day }
    : null;
}

export function isLocalDate(value: unknown): value is string {
  return parseLocalDate(value) !== null;
}

export function localDateFromDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDateZhTw(value: unknown): string | null {
  const parts = parseLocalDate(value);
  if (!parts) return null;
  return `${parts.year}年${parts.month}月${parts.day}日`;
}

export function addLocalMonths(value: unknown, months: number): string | null {
  const parts = parseLocalDate(value);
  if (!parts || !Number.isInteger(months)) return null;
  const firstOfTargetMonth = new Date(parts.year, parts.month - 1 + months, 1);
  const lastDay = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0).getDate();
  return localDateFromDate(new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(parts.day, lastDay)));
}

export function normalizeLocalTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = LOCAL_TIME.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? `${match[1]}:${match[2]}` : null;
}

export function formatLocalTime(value: unknown): string | null {
  return normalizeLocalTime(value);
}

export function formatLocalTimeRange(start: unknown, end: unknown): string | null {
  const normalizedStart = normalizeLocalTime(start);
  const normalizedEnd = normalizeLocalTime(end);
  return normalizedStart && normalizedEnd ? `${normalizedStart}–${normalizedEnd}` : null;
}

export function addMinutesToTime(start: unknown, durationMinutes: unknown): string | null {
  const normalizedStart = normalizeLocalTime(start);
  if (!normalizedStart || typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 0) return null;
  const [hours, minutes] = normalizedStart.split(':').map(Number);
  const total = (hours * 60 + minutes + durationMinutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function toFlatpickrDateValue(value: unknown): string | null {
  return isLocalDate(value) ? value : null;
}

export function fromFlatpickrDateValue(value: unknown): string | null {
  return isLocalDate(value) ? value : null;
}
