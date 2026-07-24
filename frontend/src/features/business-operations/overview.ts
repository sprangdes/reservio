import { getReservationStatusPresentation } from './reservations/status';
import { localDate, normalizeReservationQuery } from './reservations/query';
import type { ReservationCenterItem, ReservationPageResult, ReservationQuery } from './reservations/types';

export interface OverviewNotification {
  id: string | number;
  title: string;
  content: string;
  read: boolean;
  createdAt?: string;
  reservationId?: string | number;
}

export interface OperationsOverviewData {
  pending: ReservationPageResult | null;
  notifications: OverviewNotification[];
  unreadCount: number;
}

function toLocalDateTime(item: ReservationCenterItem): number | null {
  const date = item.reservationDate.value;
  const time = item.startTime.value;
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}/.test(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

export function createOverviewPendingQuery(now = new Date()): ReservationQuery {
  const base = normalizeReservationQuery({ preset: 'pending' }, now);
  return { ...base, page: 0, pageSize: 10, sort: { field: 'reservationDate', direction: 'asc' } };
}

export function nextUpcomingReservation(items: ReservationCenterItem[], now = new Date()): ReservationCenterItem | null {
  const nowTime = now.getTime();
  return items
    .filter((item) => !getReservationStatusPresentation(item.backendStatus).terminal)
    .map((item) => ({ item, timestamp: toLocalDateTime(item) }))
    .filter((entry): entry is { item: ReservationCenterItem; timestamp: number } => entry.timestamp !== null && entry.timestamp >= nowTime)
    .sort((left, right) => left.timestamp - right.timestamp)[0]?.item || null;
}

export function todayAgendaPreview(items: ReservationCenterItem[], now = new Date(), limit = 4): ReservationCenterItem[] {
  const today = localDate(now);
  return items
    .filter((item) => item.reservationDate.value === today)
    .slice()
    .sort((left, right) => (toLocalDateTime(left) || Number.MAX_SAFE_INTEGER) - (toLocalDateTime(right) || Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
}

export function todaySummary(today: ReservationPageResult | null, pending: ReservationPageResult | null) {
  return {
    todayCount: today?.totalCount ?? null,
    pendingCount: pending?.totalCount ?? null,
    source: { todayCount: today ? 'backend-total' : 'unavailable', pendingCount: pending ? 'backend-total' : 'unavailable' } as const
  };
}

export function isActionableException(item: ReservationCenterItem): boolean {
  return item.status === 'CANCEL_REQUESTED';
}
