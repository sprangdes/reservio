import { formatTimeHM } from '../../utils/time';
import ReservationCancelReason from './ReservationCancelReason';
import ReservationStatusBadge from './ReservationStatusBadge';
import ReservationActionControls from './ReservationActionControls';
import type { ReservationItem } from './types';

export default function ReservationDesktopRow({ reservation, onAction }: Readonly<{
    reservation: ReservationItem;
    onAction: (id: string | number, action: string) => void | Promise<void>
}>) {
  return (
    <tr>
      <td className="ps-4 text-start">{reservation.reservationDate}</td>
      <td className="text-start fw-bold text-primary">{formatTimeHM(reservation.startTime)}</td>
      <td className="text-start">{reservation.username}</td>
      <td className="text-start"><span className="text-dark">{reservation.title}</span></td>
      <td className="text-start">
        <small className="text-muted text-break">{reservation.remark || '無備註'}</small>
        <ReservationCancelReason status={reservation.status} cancelReason={reservation.cancelReason} />
      </td>
      <td className="text-center"><ReservationStatusBadge status={reservation.status} /></td>
      <td className="text-center pe-4"><ReservationActionControls status={reservation.status} reservationId={reservation.id} onAction={onAction} /></td>
    </tr>
  );
}
