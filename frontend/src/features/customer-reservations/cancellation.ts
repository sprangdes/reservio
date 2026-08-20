import type { ReservationSummary } from './domain';
import { requiresCancellationReason } from './capabilities';

export type CancellationPayload = Readonly<Record<string, never> | { cancelReason: string }>;

export function mapReservationCancellation(reservation: ReservationSummary, reason: string): CancellationPayload | null {
  if (!requiresCancellationReason(reservation.status)) return {};
  const cancelReason = reason.trim();
  return cancelReason ? { cancelReason } : null;
}

export function cancellationSuccessMessage(reservation: ReservationSummary): string {
  return reservation.status === 'PENDING' ? '預約已取消。' : '取消申請已送出。';
}
