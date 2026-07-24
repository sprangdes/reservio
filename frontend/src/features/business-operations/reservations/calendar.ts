import { localDate, normalizeReservationQuery } from './query';
import type { ReservationCalendarEvent, ReservationCalendarViewMode, ReservationCenterItem, ReservationQuery } from './types';

function dateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : null;
}

function dateFromLocalParts(value: string) {
  const parts = dateParts(value);
  return parts ? new Date(parts.year, parts.month, parts.day) : null;
}

export function addCalendarDays(value: string, amount: number): string {
  const date = dateFromLocalParts(value);
  if (!date) return value;
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

export function calendarWeekRange(value: string): { startDate: string; endDate: string } {
  const date = dateFromLocalParts(value);
  if (!date) return { startDate: value, endDate: value };
  return { startDate: addCalendarDays(value, -date.getDay()), endDate: addCalendarDays(value, 6 - date.getDay()) };
}

export function calendarMonthRange(value: string): { startDate: string; endDate: string } {
  const date = dateFromLocalParts(value);
  if (!date) return { startDate: value, endDate: value };
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { startDate: localDate(first), endDate: localDate(last) };
}

export function getCalendarRange(value: string, mode: ReservationCalendarViewMode): { startDate: string; endDate: string } {
  if (mode === 'week') return calendarWeekRange(value);
  if (mode === 'month') return calendarMonthRange(value);
  return { startDate: value, endDate: value };
}

export function navigateCalendarDate(value: string, mode: ReservationCalendarViewMode, direction: -1 | 1): string {
  if (mode === 'week') return addCalendarDays(value, direction * 7);
  if (mode === 'month') {
    const date = dateFromLocalParts(value);
    if (!date) return value;
    return localDate(new Date(date.getFullYear(), date.getMonth() + direction, 1));
  }
  return addCalendarDays(value, direction);
}

export function createReservationCalendarQuery(query: ReservationQuery, selectedDate: string, mode: ReservationCalendarViewMode): ReservationQuery {
  const range = getCalendarRange(selectedDate, mode);
  return normalizeReservationQuery({ ...query, preset: 'calendar', filter: { ...query.filter, dateFrom: range.startDate, dateTo: range.endDate }, page: 0, pageSize: 50, sort: { field: 'reservationDate', direction: 'asc' }, calendarView: mode });
}

export function timeToMinutes(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 1440 ? minutes : undefined;
}

export function mapReservationCalendarEvent(item: ReservationCenterItem): ReservationCalendarEvent {
  const startMinutes = timeToMinutes(item.startTime.value);
  const explicitEnd = timeToMinutes(item.endTime.value);
  const derivedEnd = startMinutes !== undefined && item.durationMinutes.value !== undefined ? Math.min(startMinutes + item.durationMinutes.value, 1440) : undefined;
  return { id: item.id, item, date: item.reservationDate.value || '', startMinutes, endMinutes: explicitEnd ?? derivedEnd, durationMinutes: item.durationMinutes.value, hasExplicitEnd: explicitEnd !== undefined };
}

export function mapReservationCalendarEvents(items: ReservationCenterItem[]): ReservationCalendarEvent[] { return items.map(mapReservationCalendarEvent); }

export interface CalendarEventLayout { event: ReservationCalendarEvent; column: number; columns: number; }

export function layoutCalendarEvents(events: ReservationCalendarEvent[]): CalendarEventLayout[] {
  const timed = events.filter((event) => event.startMinutes !== undefined).slice().sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));
  const active: Array<{ end: number; column: number }> = [];
  const layouts: CalendarEventLayout[] = [];
  for (const event of timed) {
    const start = event.startMinutes || 0;
    const end = event.endMinutes ?? Math.min(start + 15, 1440);
    for (let index = active.length - 1; index >= 0; index -= 1) if (active[index].end <= start) active.splice(index, 1);
    const used = new Set(active.map((entry) => entry.column));
    let column = 0;
    while (used.has(column)) column += 1;
    active.push({ end, column });
    const columns = Math.max(active.length, column + 1);
    layouts.push({ event, column, columns });
  }
  return layouts;
}

export function formatCalendarRange(value: string, mode: ReservationCalendarViewMode): string {
  const range = getCalendarRange(value, mode);
  const formatter = new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: mode === 'day' ? 'long' : undefined });
  if (mode === 'day') return formatter.format(dateFromLocalParts(range.startDate) || new Date());
  if (mode === 'month') return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(dateFromLocalParts(range.startDate) || new Date());
  const start = formatter.format(dateFromLocalParts(range.startDate) || new Date());
  const end = formatter.format(dateFromLocalParts(range.endDate) || new Date());
  return `${start} – ${end}`;
}
