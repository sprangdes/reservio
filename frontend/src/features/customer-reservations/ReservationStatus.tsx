import { getReservationStatusPresentation } from './status';
import type { ReservationStatusKey } from './domain';

const icons: Record<ReservationStatusKey, string> = {
  PENDING: 'bi-clock',
  CONFIRMED: 'bi-check-circle-fill',
  CANCEL_REQUESTED: 'bi-hourglass-split',
  CANCELLED: 'bi-x-circle',
  COMPLETED: 'bi-check-circle',
  UNKNOWN: 'bi-question-circle'
};

export default function ReservationStatus({ status }: Readonly<{ status: ReservationStatusKey }>) {
  const presentation = getReservationStatusPresentation(status);
  return (
    <span className={`customer-reservation-status is-${presentation.category}`} role="status">
      <i className={`bi ${icons[presentation.key]}`} aria-hidden="true" />
      <span>{presentation.label}</span>
    </span>
  );
}
