export const WEEKDAYS = [
  { key: 'MONDAY', label: '星期一' }, { key: 'TUESDAY', label: '星期二' },
  { key: 'WEDNESDAY', label: '星期三' }, { key: 'THURSDAY', label: '星期四' },
  { key: 'FRIDAY', label: '星期五' }, { key: 'SATURDAY', label: '星期六' },
  { key: 'SUNDAY', label: '星期日' }
] as const;

export type WeekdayKey = typeof WEEKDAYS[number]['key'];
export type DayOfWeek = WeekdayKey;
export type WeekdayHoursValue = { dayOfWeek: DayOfWeek; open: boolean; startTime: string | null; endTime: string | null; inconsistent?: boolean };
export type WeeklyHoursValue = { days: WeekdayHoursValue[] };
export type DefaultSlotResponse = { defaultInterval?: number | null; defaultWeekSlots?: unknown[] };
export type DefaultSlotRequest = { defaultInterval: number; defaultWeekSlots: Array<{ dayOfWeek: DayOfWeek; startTime: string | null; endTime: string | null }> };
export type DateOverrideStatus = 'inherited' | 'special-hours' | 'special-closure';
export type DateOverrideValue = { date: string; open: boolean; startTime: string | null; endTime: string | null };

const weekdaySet = new Set<string>(WEEKDAYS.map((day) => day.key));
const time = (value: unknown): string | null => typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : null;

export function emptyWeeklyHours(): WeeklyHoursValue { return { days: WEEKDAYS.map(({ key }) => ({ dayOfWeek: key, open: false, startTime: null, endTime: null })) }; }
export function weekdayLabel(dayOfWeek: string): string { return WEEKDAYS.find((day) => day.key === dayOfWeek)?.label || dayOfWeek; }
export function weekdayForDate(date: string): string { const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null; return parsed && !Number.isNaN(parsed.getTime()) ? weekdayLabel(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][parsed.getDay()]) : ''; }

export function normalizeWeeklyHours(response: DefaultSlotResponse): WeeklyHoursValue {
  const byDay = new Map<string, any>();
  if (Array.isArray(response.defaultWeekSlots)) response.defaultWeekSlots.forEach((slot: any) => { if (weekdaySet.has(slot?.dayOfWeek) && !byDay.has(slot.dayOfWeek)) byDay.set(slot.dayOfWeek, slot); });
  return { days: WEEKDAYS.map(({ key }) => {
    const source = byDay.get(key);
    if (!source) return { dayOfWeek: key, open: false, startTime: null, endTime: null };
    const startTime = time(source.startTime); const endTime = time(source.endTime);
    const inconsistent = Boolean(startTime) !== Boolean(endTime);
    return inconsistent ? { dayOfWeek: key, open: false, startTime, endTime, inconsistent: true } : { dayOfWeek: key, open: Boolean(startTime && endTime), startTime, endTime };
  }) };
}

export function defaultSlotRequest(hours: WeeklyHoursValue, authoritativeInterval: unknown): DefaultSlotRequest {
  const defaultInterval = Number(authoritativeInterval);
  if (!Number.isInteger(defaultInterval) || defaultInterval <= 0) throw new Error('目前無法取得預約間隔');
  if (hours.days.length !== WEEKDAYS.length) throw new Error('每週營業時間資料不完整');
  return { defaultInterval, defaultWeekSlots: WEEKDAYS.map(({ key }) => {
    const value = hours.days.find((day) => day.dayOfWeek === key);
    if (!value || value.inconsistent) throw new Error('每週營業時間資料不完整');
    return { dayOfWeek: key, startTime: value.open ? value.startTime : null, endTime: value.open ? value.endTime : null };
  }) };
}
export function intervalDefaultSlotRequest(current: DefaultSlotResponse, interval: unknown): DefaultSlotRequest { return defaultSlotRequest(normalizeWeeklyHours(current), interval); }

export function withWeeklyDay(hours: WeeklyHoursValue, dayOfWeek: DayOfWeek, change: Partial<WeekdayHoursValue>): WeeklyHoursValue { return { days: hours.days.map((day) => day.dayOfWeek === dayOfWeek ? { ...day, ...change } : day) }; }
export function normalizeOverride(value: any, fallbackDate: string): DateOverrideValue { const startTime = time(value?.startTime); const endTime = time(value?.endTime); return { date: typeof value?.date === 'string' ? value.date.slice(0, 10) : fallbackDate, open: value?.open !== false, startTime, endTime }; }
export function deriveOverrideStatus(explicit: DateOverrideValue | undefined): DateOverrideStatus { return !explicit ? 'inherited' : explicit.open && explicit.startTime && explicit.endTime ? 'special-hours' : 'special-closure'; }
export function sortOverrides(values: DateOverrideValue[]): DateOverrideValue[] { return [...values].filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value.date)).sort((a, b) => a.date.localeCompare(b.date)); }
export function isValidApiDate(value: string): boolean { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }
