import type { ReservationMutationState } from '../types';

export default function ReservationMutationFeedback({ state, onRetry }: Readonly<{ state: ReservationMutationState; onRetry?: () => void }>) {
  if (state.phase === 'pending') return <p className="reservation-mutation-feedback is-pending" role="status"><i className="bi bi-arrow-repeat" aria-hidden="true" />正在更新預約</p>;
  if (state.phase === 'error') return <div className="reservation-mutation-feedback is-error" role="alert"><span>{state.error?.message || '更新預約失敗'}</span>{onRetry ? <button type="button" onClick={onRetry}>重試</button> : null}</div>;
  if (state.phase === 'stale') return <p className="reservation-mutation-feedback is-success" role="status"><i className="bi bi-check-circle" aria-hidden="true" />預約已更新，清單資料已重新整理。</p>;
  return null;
}
