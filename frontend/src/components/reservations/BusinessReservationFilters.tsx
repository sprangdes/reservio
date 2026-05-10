import type { RefObject } from 'react';
import type { FilterDraft, ServiceOption } from './types';

interface StatusOption { value: string; label: string; }
interface Props {
  filterDraft: FilterDraft;
  services: ServiceOption[];
  dateFromRef: RefObject<HTMLInputElement | null>;
  dateToRef: RefObject<HTMLInputElement | null>;
  statusLabel?: string;
  statusOptions: StatusOption[];
  updateFilterDraft: (patch: Partial<FilterDraft>) => void;
  applyFilters: (event: { preventDefault: () => void }) => void;
  clearFilters: () => void;
}

export default function BusinessReservationFilters({ filterDraft, services, dateFromRef, dateToRef, statusLabel = '預約狀態', statusOptions, updateFilterDraft, applyFilters, clearFilters }: Props) {
  return (
    <div className="p-3 border-bottom bg-white">
      <form onSubmit={applyFilters}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3"><label htmlFor="start-date" className="form-label">開始日期</label><input id="start-date" type="text" className="form-control bg-white" placeholder="選擇開始日期" ref={dateFromRef} value={filterDraft.dateFrom} onChange={(e) => updateFilterDraft({ dateFrom: e.target.value })} /></div>
          <div className="col-12 col-md-3"><label htmlFor="end-date" className="form-label">結束日期</label><input id="end-date" type="text" className="form-control bg-white" placeholder="選擇結束日期" ref={dateToRef} value={filterDraft.dateTo} onChange={(e) => updateFilterDraft({ dateTo: e.target.value })} /></div>
          <div className="col-12 col-md-3"><label htmlFor="service-item" className="form-label">服務項目</label><select id="service-item" className="form-select" value={filterDraft.service} onChange={(e) => updateFilterDraft({ service: e.target.value })}><option value="">全部</option>{services.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}</select></div>
          <div className="col-12 col-md-3"><label htmlFor="reservation-status" className="form-label">{statusLabel}</label><select id="reservation-status" className="form-select" value={filterDraft.status} onChange={(e) => updateFilterDraft({ status: e.target.value })}>{statusOptions.map((option) => <option key={option.value || '__empty'} value={option.value}>{option.label}</option>)}</select></div>
          <div className="col-12 col-md-3"><label htmlFor="search-keyword" className="form-label">關鍵字</label><input id="search-keyword" type="text" className="form-control" placeholder="姓名 / 電話 / 備註" value={filterDraft.keyword} onChange={(e) => updateFilterDraft({ keyword: e.target.value })} /></div>
          <div className="col-12 col-md-3 d-flex gap-2"><button type="submit" className="btn btn-gradient fw-bold shadow-sm w-100">查詢</button><button type="button" className="btn btn-outline-secondary fw-bold w-100" onClick={clearFilters}>清除</button></div>
        </div>
      </form>
    </div>
  );
}
