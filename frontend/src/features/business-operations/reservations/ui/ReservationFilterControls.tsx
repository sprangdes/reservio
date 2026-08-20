import { useEffect, useState } from 'react';
import type { ReservationFilter, ReservationQuery, ReservationSort, ReservationStatusKey } from '../types';

type ServiceOption = { id: string | number; name: string };
const backendStatuses: Array<{ value: ReservationStatusKey; label: string }> = [{ value: 'PENDING', label: '待確認' }, { value: 'CONFIRMED', label: '已確認' }, { value: 'CANCEL_REQUESTED', label: '取消申請中' }, { value: 'CANCELLED', label: '已取消' }, { value: 'COMPLETED', label: '已完成' }];

export function ReservationFilterSummary({ query, onRemove, onClear }: Readonly<{ query: ReservationQuery; onRemove: (key: keyof ReservationFilter, value?: ReservationStatusKey) => void; onClear: () => void }>) {
  const chips: Array<{ key: keyof ReservationFilter; label: string; value?: ReservationStatusKey }> = [];
  if (query.filter.dateFrom || query.filter.dateTo) chips.push({ key: 'dateFrom', label: `${query.filter.dateFrom || '開始'} 至 ${query.filter.dateTo || '結束'}` });
  if (query.filter.service) chips.push({ key: 'service', label: query.filter.service });
  if (query.filter.keyword) chips.push({ key: 'keyword', label: `關鍵字：${query.filter.keyword}` });
  query.filter.statuses.forEach((status) => chips.push({ key: 'statuses', value: status, label: backendStatuses.find((entry) => entry.value === status)?.label || status }));
  if (!chips.length) return null;
  return <div className="reservation-center-ui__filter-summary" aria-label="已套用篩選"><span>已套用</span>{chips.map((chip) => <button type="button" key={`${chip.key}-${chip.value || chip.label}`} onClick={() => onRemove(chip.key, chip.value)}>{chip.label}<i className="bi bi-x" aria-hidden="true" /><span className="visually-hidden">移除篩選</span></button>)}<button type="button" className="reservation-center-ui__clear-filters" onClick={onClear}>清除全部</button></div>;
}

export default function ReservationFilterControls({ query, services, onApply, onSort }: Readonly<{ query: ReservationQuery; services: ServiceOption[]; onApply: (filter: ReservationFilter) => void; onSort: (sort: ReservationSort) => void }>) {
  const [draft, setDraft] = useState(query.filter);
  useEffect(() => setDraft(query.filter), [query.filter]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); onApply(draft); };
  return <><form className="reservation-center-ui__filters" onSubmit={submit}><label><span>開始日期</span><input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })} /></label><label><span>結束日期</span><input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })} /></label><label><span>服務項目</span><select value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })}><option value="">全部服務</option>{services.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}</select></label><label><span>預約狀態</span><select value={draft.statuses[0] || ''} onChange={(event) => setDraft({ ...draft, statuses: event.target.value ? [event.target.value as ReservationStatusKey] : [] })}><option value="">全部狀態</option>{backendStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="reservation-center-ui__search"><span>關鍵字</span><input type="search" value={draft.keyword} placeholder="搜尋顧客名稱或備註" onChange={(event) => setDraft({ ...draft, keyword: event.target.value })} /></label><button type="submit"><i className="bi bi-funnel" aria-hidden="true" />篩選</button></form><label className="reservation-center-ui__sort"><span>排序</span><select value={`${query.sort.field}:${query.sort.direction}`} onChange={(event) => { const [field, direction] = event.target.value.split(':'); onSort({ field: field as ReservationSort['field'], direction: direction as ReservationSort['direction'] }); }}><option value="reservationDate:desc">日期：新到舊</option><option value="reservationDate:asc">日期：舊到新</option><option value="startTime:asc">時間：早到晚</option><option value="startTime:desc">時間：晚到早</option><option value="username:asc">顧客名稱</option><option value="title:asc">服務項目</option><option value="status:asc">預約狀態</option></select></label></>;
}
