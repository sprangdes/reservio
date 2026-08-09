import type { BookingBusiness, BookingDraft, BookingService } from './domain';

export const emptyBookingDraft = (): BookingDraft => ({ business: null, service: null, date: null, startTime: null, estimatedEndTime: null, remark: '' });

export function selectBookingBusiness(draft: BookingDraft, business: BookingBusiness | null): BookingDraft {
  return { ...draft, business, service: null, date: null, startTime: null, estimatedEndTime: null };
}

export function selectBookingService(draft: BookingDraft, service: BookingService | null): BookingDraft {
  return { ...draft, service: service ? { id: service.id, name: service.name, durationMinutes: service.durationMinutes } : null, date: null, startTime: null, estimatedEndTime: null };
}

export function selectBookingDate(draft: BookingDraft, date: string | null): BookingDraft {
  return { ...draft, date, startTime: null, estimatedEndTime: null };
}

export function updateBookingRemark(draft: BookingDraft, remark: string): BookingDraft {
  return { ...draft, remark };
}
