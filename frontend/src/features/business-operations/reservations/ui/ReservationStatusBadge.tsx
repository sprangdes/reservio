import { getReservationStatusPresentation } from '../status';
import type { ReservationCenterItem } from '../types';

export default function ReservationStatusBadge({ item }: Readonly<{ item: ReservationCenterItem }>) {
  const status = getReservationStatusPresentation(item.backendStatus);
  return <span className={`reservation-status reservation-status--${status.tone}`} aria-label={`預約狀態：${status.label}`}><i className={`bi bi-${status.icon}`} aria-hidden="true" />{status.label}</span>;
}
