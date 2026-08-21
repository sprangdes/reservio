import { isLocalDate } from '../customer-booking/bookingDates';
import type { ReservationPage, ReservationSummary } from './domain';

export type CustomerReservationQuery = Readonly<{ page: number; size: number; sortBy: string; sortDir: 'asc' | 'desc'; condition: Record<string, string | null> }>;

export function mapCustomerReservationQuery(query: CustomerReservationQuery): Readonly<{ params: { page: number; size: number; sortBy: string; sortDir: 'asc' | 'desc' }; condition: Record<string, string | null> }> {
  return { params: { page: query.page, size: query.size, sortBy: query.sortBy, sortDir: query.sortDir }, condition: { ...query.condition } };
}

export type ReservationSections = Readonly<{ next: ReservationSummary | null; attention: ReservationSummary[]; upcoming: ReservationSummary[]; history: ReservationSummary[] }>;

export function classifyLoadedReservationPage(page: ReservationPage, today: string, nowTime: string): ReservationSections {
  const now = `${today}T${nowTime}`;
  // Preserve the API order selected by the user; only the dedicated next-reservation card needs a chronological lookup.
  const futureEligible = page.items.filter((item) => (item.status === 'PENDING' || item.status === 'CONFIRMED') && `${item.date}T${item.startTime}` > now);
  const next = futureEligible.reduce<ReservationSummary | null>((nearest, item) => !nearest || `${item.date}T${item.startTime}` < `${nearest.date}T${nearest.startTime}` ? item : nearest, null);
  return {
    next,
    attention: page.items.filter((item) => item.status === 'CANCEL_REQUESTED'),
    upcoming: futureEligible.filter((item) => item.id !== next?.id),
    history: page.items.filter((item) => item.status === 'COMPLETED' || item.status === 'CANCELLED' || (isLocalDate(item.date) && `${item.date}T${item.startTime}` <= now && (item.status === 'PENDING' || item.status === 'CONFIRMED' || item.status === 'CANCEL_REQUESTED')))
  };
}
