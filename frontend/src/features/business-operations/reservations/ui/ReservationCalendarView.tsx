import { useEffect, useMemo, useState } from 'react';
import { localDate } from '../query';
import { mapReservationCalendarEvents } from '../calendar';
import { isPreviewCapability } from '../../future/featureFlags';
import ReservationAgenda from './ReservationAgenda';
import ReservationCalendarControls from './ReservationCalendarControls';
import ReservationDayView from './ReservationDayView';
import ReservationMonthView from './ReservationMonthView';
import { ReservationCalendarEmptyState, ReservationCalendarErrorState, ReservationCalendarSkeleton } from './ReservationCalendarStates';
import ReservationWeekView from './ReservationWeekView';
import type { ReservationCalendarState, ReservationCenterItem, ReservationFilter, ReservationLoadState } from '../types';

function useCurrentMinutes() {
  const [minutes, setMinutes] = useState(() => { const now = new Date(); return now.getHours() * 60 + now.getMinutes(); });
  useEffect(() => { const timer = window.setInterval(() => { const now = new Date(); setMinutes(now.getHours() * 60 + now.getMinutes()); }, 60000); return () => window.clearInterval(timer); }, []);
  return minutes;
}

export default function ReservationCalendarView({ calendar, filter, selectedId, onSelect, onDate, onMode, onLoad, onClearFilters, onOpenList }: Readonly<{ calendar: ReservationCalendarState; filter: ReservationFilter; selectedId?: string | number; onSelect: (item: ReservationCenterItem) => void; onDate: (date: string) => void; onMode: (mode: ReservationCalendarState['mode']) => void; onLoad: (mode?: 'initial' | 'refresh' | 'retry') => Promise<unknown>; onClearFilters: () => void; onOpenList: () => void }>) {
  const filterKey = JSON.stringify({ statuses: filter.statuses, service: filter.service, keyword: filter.keyword });
  useEffect(() => { void onLoad().catch(() => undefined); }, [calendar.mode, calendar.selectedDate, filterKey, onLoad]);
  const events = useMemo(() => mapReservationCalendarEvents(calendar.result?.items || []), [calendar.result]);
  const nowMinutes = useCurrentMinutes();
  const showCurrentTime = calendar.selectedDate === localDate() && calendar.mode !== 'month';
  const filtered = Boolean(filter.statuses.length || filter.service || filter.keyword);
  const selectEvent = (event: typeof events[number]) => onSelect(event.item);
  const selectDate = (date: string) => { onDate(date); onMode('day'); };
  const state: ReservationLoadState = calendar.loadState;
  const hasContent = Boolean(calendar.result?.items.length);
  const retry = () => { void onLoad('retry').catch(() => undefined); };
  return <section className="reservation-calendar" aria-labelledby="reservation-calendar-heading"><header className="reservation-calendar__header"><div><p>行程安排</p><h2 id="reservation-calendar-heading">行事曆</h2><span>{calendar.result ? `目前範圍共 ${calendar.result.totalCount} 筆預約` : '依日期查看預約安排。'}</span></div><button type="button" className="reservation-calendar__list-link" onClick={onOpenList}><i className="bi bi-list-ul" aria-hidden="true" />切換至清單</button></header><ReservationCalendarControls selectedDate={calendar.selectedDate} mode={calendar.mode} onDate={onDate} onMode={onMode} />{isPreviewCapability('resourceScheduling') ? <div className="reservation-calendar__resource-boundary" aria-disabled="true"><i className="bi bi-people" aria-hidden="true" />資源排程 <small>即將提供</small></div> : null}<div className="reservation-calendar__legend" aria-label="預約狀態說明"><span><i className="bi bi-check-circle" aria-hidden="true" />已確認</span><span><i className="bi bi-hourglass-split" aria-hidden="true" />待確認</span><span><i className="bi bi-clock-history" aria-hidden="true" />取消申請中</span></div>{state.phase === 'refreshing' && hasContent ? <p className="reservation-calendar__refreshing" role="status">正在更新行事曆</p> : null}{state.phase === 'query-error' && !hasContent ? <ReservationCalendarErrorState state={state} onRetry={retry} /> : state.phase === 'initial-loading' && !hasContent ? <ReservationCalendarSkeleton /> : state.phase === 'empty' || state.phase === 'filter-empty' ? <ReservationCalendarEmptyState mode={calendar.mode} filtered={filtered} onToday={() => onDate(localDate())} onClear={onClearFilters} /> : <>{state.phase === 'query-error' && hasContent ? <div className="reservation-calendar__stale-warning" role="status">行事曆未完成更新，正在顯示先前資料。<button type="button" onClick={retry}>重試</button></div> : null}{calendar.mode === 'day' ? <ReservationDayView events={events} selectedId={selectedId} onSelect={selectEvent} nowMinutes={nowMinutes} showCurrentTime={showCurrentTime} /> : null}{calendar.mode === 'week' ? <><ReservationWeekView selectedDate={calendar.selectedDate} events={events} selectedId={selectedId} onSelect={selectEvent} nowMinutes={nowMinutes} /><ReservationAgenda events={events.filter((event) => event.date === calendar.selectedDate)} selectedId={selectedId} onSelect={selectEvent} nowMinutes={nowMinutes} showCurrentTime={showCurrentTime} /></> : null}{calendar.mode === 'month' ? <ReservationMonthView selectedDate={calendar.selectedDate} events={events} onSelectDate={selectDate} /> : null}</>}</section>;
}
