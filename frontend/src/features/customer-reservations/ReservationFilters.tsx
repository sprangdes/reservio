import type { FormEvent } from 'react';

export type ReservationFilterDraft = Readonly<{
  dateFrom: string;
  dateTo: string;
  businessId: string;
  service: string;
  status: string;
  keyword: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}>;

type Option = Readonly<{ id: string; name: string }>;
type Props = Readonly<{
  open: boolean;
  draft: ReservationFilterDraft;
  businesses: Option[];
  services: Option[];
  servicesLoading: boolean;
  servicesError: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ReservationFilterDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onRetryServices: () => void;
}>;

export default function ReservationFilters({ open, draft, businesses, services, servicesLoading, servicesError, onToggle, onChange, onSubmit, onClear, onRetryServices }: Props) {
  return (
    <section className="customer-reservation-filters" aria-label="篩選與搜尋">
      <button type="button" className="customer-reservation-filters__trigger" aria-expanded={open} aria-controls="reservation-filter-panel" onClick={onToggle}>
        <i className="bi bi-sliders2" aria-hidden="true" /> 篩選與搜尋 <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
      {open ? (
        <form id="reservation-filter-panel" className="customer-reservation-filters__panel" onSubmit={onSubmit}>
          <label>開始日期<input type="date" value={draft.dateFrom} onChange={(event) => onChange({ dateFrom: event.target.value })} /></label>
          <label>結束日期<input type="date" min={draft.dateFrom || undefined} value={draft.dateTo} onChange={(event) => onChange({ dateTo: event.target.value })} /></label>
          <label>店家<select value={draft.businessId} onChange={(event) => onChange({ businessId: event.target.value, service: '' })}><option value="">全部</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
          <label>服務<select value={draft.service} disabled={!draft.businessId || servicesLoading} onChange={(event) => onChange({ service: event.target.value })}><option value="">{draft.businessId ? '全部' : '請先選擇店家'}</option>{services.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}</select>{servicesError ? <span className="customer-reservation-filters__service-error">暫時無法載入服務。<button type="button" onClick={onRetryServices}>重新載入服務</button></span> : null}</label>
          <label>狀態<select value={draft.status} onChange={(event) => onChange({ status: event.target.value })}><option value="">全部</option><option value="PENDING">等待店家確認</option><option value="CONFIRMED">已確認</option><option value="CANCEL_REQUESTED">取消申請處理中</option><option value="CANCELLED">已取消</option><option value="COMPLETED">已完成</option></select></label>
          <label>關鍵字<input value={draft.keyword} placeholder="店家、服務或備註" onChange={(event) => onChange({ keyword: event.target.value })} /></label>
          <label>排序<select value={`${draft.sortBy}:${draft.sortDir}`} onChange={(event) => { const [sortBy, sortDir] = event.target.value.split(':'); onChange({ sortBy, sortDir: sortDir as 'asc' | 'desc' }); }}><option value="reservationDate:desc">日期：新到舊</option><option value="reservationDate:asc">日期：舊到新</option><option value="businessName:asc">店家：A 至 Z</option><option value="status:asc">狀態</option></select></label>
          <div className="customer-reservation-filters__actions"><button type="submit">套用篩選</button><button type="button" onClick={onClear}>清除</button></div>
        </form>
      ) : null}
    </section>
  );
}
