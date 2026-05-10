import { formatTimeHM } from '../../utils/time';
import ReservationStatusBadge from './ReservationStatusBadge';
import ReservationActionControls from './ReservationActionControls';
import ReservationCancelReason from './ReservationCancelReason';
import type { ReservationItem } from './types';

export default function ReservationMobileCard({ reservation, onAction }: { reservation: ReservationItem; onAction: (id: string | number, action: string) => void | Promise<void> }) {
  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="fw-bold">{reservation.username}</div>
          <div className="d-flex align-items-center gap-2">
            <ReservationStatusBadge status={reservation.status} />
            <ReservationActionControls status={reservation.status} reservationId={reservation.id} onAction={onAction} compact />
          </div>
        </div>
        <div className="small text-muted mb-1">日期：{reservation.reservationDate}</div>
        <div className="small text-muted mb-1">時間：{formatTimeHM(reservation.startTime)}</div>
        <div className="small text-muted mb-1">服務：{reservation.title}</div>
        <div className="small text-muted mb-2">備註：{reservation.remark || '無備註'}</div>
        <ReservationCancelReason status={reservation.status} cancelReason={reservation.cancelReason} compact />
        <div className="d-flex gap-2"></div>
      </div>
    </div>
  );
}
