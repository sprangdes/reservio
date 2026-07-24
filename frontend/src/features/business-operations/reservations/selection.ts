import type { ReservationCenterItem, ReservationDetailsSelection } from './types';

export function selectReservation(item: ReservationCenterItem | undefined): ReservationDetailsSelection | null {
  return item ? { id: item.id, item, availability: item.detailsAvailability } : null;
}

export function reconcileReservationSelection(selection: ReservationDetailsSelection | null, items: ReservationCenterItem[]): ReservationDetailsSelection | null {
  if (!selection) return null;
  const updated = items.find((item) => String(item.id) === String(selection.id));
  return updated ? selectReservation(updated) : selection;
}
