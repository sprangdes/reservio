import { isLocalDate } from '../customer-booking/bookingDates';
import type { ReservationPage, ReservationSummary } from './domain';

export type CustomerReservationQuery = Readonly<{ page: number; size: number; sortBy: string; sortDir: 'asc' | 'desc'; condition: Record<string, string | null> }>;

export function mapCustomerReservationQuery(query: CustomerReservationQuery): Readonly<{ params: { page: number; size: number; sortBy: string; sortDir: 'asc' | 'desc' }; condition: Record<string, string | null> }> {
  return { params: { page: query.page, size: query.size, sortBy: query.sortBy, sortDir: query.sortDir }, condition: { ...query.condition } };
}

export type ReservationSections = Readonly<{ next: ReservationSummary | null; attention: ReservationSummary[]; upcoming: ReservationSummary[]; history: ReservationSummary[] }>;

function compareSchedule(left: ReservationSummary, right: ReservationSummary): number {
  return `${left.date}T${left.startTime}`.localeCompare(`${right.date}T${right.startTime}`);
}

export function classifyLoadedReservationPage(page: ReservationPage, today: string, nowTime: string): ReservationSections {
  const now = `${today}T${nowTime}`;
  const futureEligible = page.items.filter((item) => (item.status === 'PENDING' || item.status === 'CONFIRMED') && `${item.date}T${item.startTime}` > now).sort(compareSchedule);
  const next = futureEligible[0] || null;
  return {
    next,
    attention: page.items.filter((item) => item.status === 'CANCEL_REQUESTED').sort(compareSchedule),
    upcoming: futureEligible.filter((item) => item.id !== next?.id),
    history: page.items.filter((item) => item.status === 'COMPLETED' || item.status === 'CANCELLED' || (isLocalDate(item.date) && `${item.date}T${item.startTime}` <= now && (item.status === 'PENDING' || item.status === 'CONFIRMED' || item.status === 'CANCEL_REQUESTED'))).sort(compareSchedule)
  };
}
