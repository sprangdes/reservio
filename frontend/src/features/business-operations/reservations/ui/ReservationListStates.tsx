import { Link } from 'react-router-dom';
import type { ReservationLoadState, ReservationViewPreset } from '../types';

export function ReservationListSkeleton() { return <div className="reservation-center-ui__skeleton" aria-label="正在載入預約" aria-busy="true"><span /><span /><span /><span /><span /></div>; }

export function ReservationEmptyState({ preset, filtered, onClear }: Readonly<{ preset: Exclude<ReservationViewPreset, 'calendar'>; filtered: boolean; onClear: () => void }>) {
  const message = filtered ? '沒有符合目前篩選條件的預約。' : preset === 'today' ? '今天目前沒有預約。' : preset === 'pending' ? '目前沒有待處理的預約。' : '目前沒有預約結果。';
  return <section className="reservation-center-ui__empty" aria-live="polite"><i className="bi bi-calendar2-x" aria-hidden="true" /><h2>{message}</h2><p>{filtered ? '可清除篩選條件，重新查看預約。' : '可切換檢視或查看全部預約。'}</p>{filtered ? <button type="button" onClick={onClear}>清除篩選</button> : preset !== 'all' ? <Link to="/reservation/manage">查看全部預約</Link> : null}</section>;
}

export function ReservationErrorState({ state, onRetry }: Readonly<{ state: ReservationLoadState; onRetry: () => void }>) { return <section className="reservation-center-ui__error" role="alert"><i className="bi bi-exclamation-triangle" aria-hidden="true" /><div><h2>無法載入預約</h2><p>{state.error?.message || '請稍後再試。'}</p></div><button type="button" onClick={onRetry}>重試</button></section>; }

export function ReservationCalendarBoundary() { return <section className="reservation-center-ui__calendar-boundary" aria-live="polite"><i className="bi bi-calendar3" aria-hidden="true" /><h2>行事曆正在整合</h2><p>目前尚未提供可安全使用的統一行事曆資料，因此不顯示預約時段。</p></section>; }
