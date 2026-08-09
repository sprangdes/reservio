import type { ReservationStatusKey } from './domain';

export function canCancelReservation(status: ReservationStatusKey): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

export function requiresCancellationReason(status: ReservationStatusKey): boolean {
  return status === 'CONFIRMED';
}
