import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../state/AuthContext';
import { defaultReservationFilter } from './reservations/query';
import { getReservationRouteForPreset } from './reservations/routePresets';
import { useReservationCenter } from './reservations/hooks/useReservationCenter';
import ReservationDesktopList from './reservations/ui/ReservationDesktopList';
import ReservationFilterControls, { ReservationFilterSummary } from './reservations/ui/ReservationFilterControls';
import { ReservationCalendarBoundary, ReservationEmptyState, ReservationErrorState, ReservationListSkeleton } from './reservations/ui/ReservationListStates';
import ReservationMobileList from './reservations/ui/ReservationMobileList';
import { ReservationDesktopPagination, ReservationMobileLoadMore } from './reservations/ui/ReservationPagination';
import ReservationViewSwitcher from './reservations/ui/ReservationViewSwitcher';
import type { ReservationCenterItem, ReservationFilter, ReservationSort, ReservationStatusKey, ReservationViewPreset } from './reservations/types';

export type ReservationCenterPreset = Exclude<ReservationViewPreset, 'calendar'>;

const presetMeta: Record<ReservationCenterPreset, { label: string; description: string }> = {
  today: { label: '今天', description: '掌握今天的預約與待處理事項。' },
  pending: { label: '待處理', description: '集中處理待確認預約與取消申請。' },
  all: { label: '全部', description: '集中查看、處理並追蹤所有預約。' }
};

type ServiceOption = { id: string | number; name: string };

function useBusinessServices() {
  const { me } = useAuth();
  const [services, setServices] = useState<ServiceOption[]>([]);
  useEffect(() => {
    const businessId = me?.business?.id;
    if (!businessId) { setServices([]); return; }
    void api.businessActiveServices(businessId).then((response: any) => {
      const values = response?.items || response?.data || response || [];
      setServices(Array.isArray(values) ? values.filter((item) => item && (typeof item.id === 'string' || typeof item.id === 'number') && typeof item.name === 'string') : []);
    }).catch(() => setServices([]));
  }, [me]);
  return services;
}

function LegacyReservationPage({ content }: Readonly<{ content: ReactNode }>) {
  return <section className="reservation-center"><header className="reservation-center__header"><p>預約中心</p><h1>現有預約管理</h1><Link to="/reservation/manage" className="reservation-center__back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> 返回新版預約中心</Link></header><div className="reservation-center__legacy">{content}</div></section>;
}

export default function ReservationCenterPage({ preset, legacyContent }: Readonly<{ preset: ReservationCenterPreset; legacyContent: ReactNode }>) {
  const { search } = useLocation();
  const legacyMode = new URLSearchParams(search).get('legacy') === '1';
  const services = useBusinessServices();
  const controller = useReservationCenter({ preset });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const meta = presetMeta[preset];
  useEffect(() => { setCalendarOpen(false); }, [preset]);
  if (legacyMode) return <LegacyReservationPage content={legacyContent} />;

  const applyFilter = (filter: ReservationFilter) => controller.setQuery({ filter });
  const removeFilter = (key: keyof ReservationFilter, value?: ReservationStatusKey) => {
    const filter = { ...controller.query.filter };
    if (key === 'statuses' && value) filter.statuses = filter.statuses.filter((status) => status !== value);
    else if (key === 'dateFrom') { filter.dateFrom = ''; filter.dateTo = ''; }
    else if (key === 'service') filter.service = '';
    else if (key === 'keyword') filter.keyword = '';
    controller.setQuery({ filter });
  };
  const clearFilters = () => controller.setQuery({ filter: defaultReservationFilter() });
  const updateSort = (sort: ReservationSort) => controller.setQuery({ sort });
  const toggleSort = (field: ReservationSort['field']) => updateSort({ field, direction: controller.query.sort.field === field && controller.query.sort.direction === 'asc' ? 'desc' : 'asc' });
  const mutate = (item: ReservationCenterItem, action: 'confirm' | 'cancel' | 'approveCancellation' | 'rejectCancellation') => { void controller.mutate(item, action).catch(() => undefined); };
  const hasFilters = Boolean(controller.query.filter.dateFrom || controller.query.filter.dateTo || controller.query.filter.service || controller.query.filter.keyword || controller.query.filter.statuses.length);
  const visibleItems = controller.mobilePages.items.length ? controller.mobilePages.items : controller.items;
  const initialLoading = controller.loadState.phase === 'initial-loading' && !controller.items.length;
  const queryError = controller.loadState.phase === 'query-error' && !controller.items.length;

  return <section className="reservation-center reservation-center-ui" aria-labelledby="reservation-center-title"><header className="reservation-center__header reservation-center-ui__header"><div><p>營運管理</p><h1 id="reservation-center-title">預約中心</h1><span>{meta.description}</span></div>{controller.result ? <strong className="reservation-center-ui__result-context">{preset === 'today' && controller.query.filter.dateFrom ? controller.query.filter.dateFrom : `共 ${controller.pagination?.totalCount || 0} 筆`}</strong> : null}</header><ReservationViewSwitcher preset={preset} calendarOpen={calendarOpen} onCalendar={() => setCalendarOpen(true)} />{calendarOpen ? <ReservationCalendarBoundary /> : <><div className="reservation-center-ui__toolbar"><ReservationFilterControls query={controller.query} services={services} onApply={applyFilter} onSort={updateSort} /></div><details className="reservation-center-ui__mobile-filters"><summary><i className="bi bi-funnel" aria-hidden="true" />篩選與排序{hasFilters ? <b>{controller.query.filter.statuses.length + Number(Boolean(controller.query.filter.service)) + Number(Boolean(controller.query.filter.keyword)) + Number(Boolean(controller.query.filter.dateFrom || controller.query.filter.dateTo))}</b> : null}</summary><ReservationFilterControls query={controller.query} services={services} onApply={applyFilter} onSort={updateSort} /></details><ReservationFilterSummary query={controller.query} onRemove={removeFilter} onClear={clearFilters} />{controller.loadState.phase === 'refreshing' ? <p className="reservation-center-ui__refreshing" role="status"><i className="bi bi-arrow-repeat" aria-hidden="true" />正在更新預約</p> : null}{controller.mutationState.phase === 'error' ? <div className="reservation-center-ui__mutation-error" role="alert"><span>{controller.mutationState.error?.message || '更新預約失敗'}</span><button type="button" onClick={() => controller.refresh()}>重新載入</button></div> : null}{initialLoading ? <ReservationListSkeleton /> : queryError ? <ReservationErrorState state={controller.loadState} onRetry={() => { void controller.retry().catch(() => undefined); }} /> : controller.items.length === 0 ? <ReservationEmptyState preset={preset} filtered={hasFilters} onClear={clearFilters} /> : <><ReservationDesktopList items={controller.items} selectedId={controller.selection?.id} sort={controller.query.sort} onSort={toggleSort} onSelect={controller.select} onMutate={mutate} mutationPending={controller.mutationState.phase === 'pending'} /><ReservationMobileList items={visibleItems} selectedId={controller.selection?.id} onSelect={controller.select} onMutate={mutate} mutationPending={controller.mutationState.phase === 'pending'} />{controller.selection ? <section className="reservation-center-ui__selection" aria-live="polite"><span>已選取：<strong>{controller.selection.item.customerName.value || '未提供顧客名稱'}</strong></span><span>目前僅提供清單資料摘要。</span><button type="button" onClick={controller.clearSelection} aria-label="清除選取預約"><i className="bi bi-x-lg" aria-hidden="true" /></button></section> : null}{controller.pagination ? <ReservationDesktopPagination pagination={controller.pagination} onPage={(page) => controller.setQuery({ page })} onPageSize={(pageSize) => controller.setQuery({ pageSize })} /> : null}<ReservationMobileLoadMore state={controller.mobilePages} onLoadMore={() => { void controller.loadMore(); }} /></>}</>}</section>;
}
