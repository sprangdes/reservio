import { Link } from 'react-router-dom';

export function ReservationListSkeleton() {
  return <div className="customer-reservation-skeleton" aria-label="正在載入預約資料"><span /><span /><span /></div>;
}

export function ReservationErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return <section className="customer-reservation-state" role="alert"><p>暫時無法取得預約資料，請稍後再試。</p><button type="button" onClick={onRetry}>重新載入</button></section>;
}

export function ReservationStaleWarning({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return <section className="customer-reservation-stale" role="status" aria-live="polite"><p>目前顯示的是先前載入的資料，部分狀態可能尚未同步。</p><button type="button" onClick={onRetry}>重新載入</button></section>;
}

export function ReservationEmptyState() {
  return <section className="customer-reservation-empty"><p>目前還沒有預約。</p><Link to="/reservation/new">建立預約</Link></section>;
}
