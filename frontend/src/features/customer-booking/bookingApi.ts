import { isLocalDate, normalizeLocalTime } from './bookingDates';
import type { BookingCreateRequest, BookingDraft } from './domain';

export function mapBookingCreateRequest(draft: BookingDraft): BookingCreateRequest | null {
  const businessId = draft.business?.id ? Number(draft.business.id) : NaN;
  const date = isLocalDate(draft.date) ? draft.date : null;
  const startTime = normalizeLocalTime(draft.startTime);
  const endTime = normalizeLocalTime(draft.estimatedEndTime);
  const title = draft.service?.name.trim();
  if (!Number.isSafeInteger(businessId) || businessId < 1 || !date || !startTime || !endTime || !title) return null;
  return { businessId, reservationDate: date, startTime, endTime, title, remark: draft.remark };
}
