import { formatLocalDateZhTw, formatLocalTimeRange } from '../customer-booking/bookingDates';
import { canCancelReservation } from './capabilities';
import type { ReservationSummary } from './domain';
import ReservationStatus from './ReservationStatus';

type ReservationRowProps = Readonly<{
  reservation: ReservationSummary;
  variant?: 'next' | 'attention' | 'upcoming' | 'history';
  cancellationBlocked?: boolean;
  onCancel?: (reservation: ReservationSummary) => void;
}>;

export default function ReservationRow({ reservation, variant = 'upcoming', cancellationBlocked = false, onCancel }: ReservationRowProps) {
  const isAttention = variant === 'attention';
  const canOpenCancellation = canCancelReservation(reservation.status) && variant !== 'history';
  return (
    <article className={`customer-reservation-row is-${variant}`}>
      <div className="customer-reservation-row__schedule">
        <time dateTime={reservation.date}>{formatLocalDateZhTw(reservation.date)}</time>
        <strong>{formatLocalTimeRange(reservation.startTime, reservation.endTime)}</strong>
      </div>
      <div className="customer-reservation-row__context">
        <strong>{reservation.businessName}</strong>
        <span>{reservation.serviceName}</span>
      </div>
      <div className="customer-reservation-row__status">
        <ReservationStatus status={reservation.status} />
        {isAttention ? <small>店家正在處理你的取消申請。</small> : null}
      </div>
      {canOpenCancellation ? (
        <div className="customer-reservation-row__action">
          <button type="button" disabled={cancellationBlocked} aria-describedby={cancellationBlocked ? 'reservation-cancellation-stale' : undefined} onClick={() => onCancel?.(reservation)}>取消預約</button>
        </div>
      ) : null}
    </article>
  );
}
