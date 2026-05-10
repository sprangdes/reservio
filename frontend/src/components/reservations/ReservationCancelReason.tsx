import type { ReservationStatus } from './types';

interface Props {
  status: ReservationStatus;
  cancelReason?: string;
  compact?: boolean;
}

export default function ReservationCancelReason({ status, cancelReason = '', compact = false }: Readonly<Props>) {
  if (status !== 'CANCEL_REQUESTED') return null;
  if (compact) return <div className="small text-danger mb-2">取消原因：{cancelReason}</div>;
  return (
    <div className="mt-1">
      <small className="text-danger text-break">
        <i className="bi bi-exclamation-circle me-1"></i>取消原因：<span>{cancelReason}</span>
      </small>
    </div>
  );
}
