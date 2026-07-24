import type { ReservationLoadState } from '../reservations/types';

export function OverviewSectionError({ state, onRetry, label }: Readonly<{ state: ReservationLoadState; onRetry: () => void; label: string }>) {
  return <div className="operations-overview__section-error" role="alert"><i className="bi bi-exclamation-circle" aria-hidden="true" /><span>{state.error?.message || `無法載入${label}`}</span><button type="button" onClick={onRetry}>重試</button></div>;
}

export function OverviewSkeleton({ rows = 2 }: Readonly<{ rows?: number }>) {
  return <div className="operations-overview__skeleton" role="status" aria-label="正在載入營運資料">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}
