import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../state/AuthContext';
import { defaultReservationFilter } from './reservations/query';
import { useReservationCenter } from './reservations/hooks/useReservationCenter';
import ReservationDesktopList from './reservations/ui/ReservationDesktopList';
import ReservationFilterControls, { ReservationFilterSummary } from './reservations/ui/ReservationFilterControls';
import { ReservationEmptyState, ReservationErrorState, ReservationListSkeleton } from './reservations/ui/ReservationListStates';
import ReservationMobileList from './reservations/ui/ReservationMobileList';
import { ReservationDesktopPagination, ReservationMobileLoadMore } from './reservations/ui/ReservationPagination';
import ReservationViewSwitcher from './reservations/ui/ReservationViewSwitcher';
import ReservationDetailsExperience from './reservations/ui/ReservationDetailsExperience';
import ReservationCalendarView from './reservations/ui/ReservationCalendarView';
import type { ReservationMutationAction } from './reservations/details';
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
  const [confirmationAction, setConfirmationAction] = useState<ReservationMutationAction | null>(null);
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
  const requestMutation = (item: ReservationCenterItem, action: ReservationMutationAction) => { controller.select(item); setConfirmationAction(action); };
  const confirmMutation = () => {
    const item = controller.selection?.item;
    if (!item || !confirmationAction || controller.mutationState.phase === 'pending') return;
    void controller.mutate(item, confirmationAction).then(() => setConfirmationAction(null)).catch(() => undefined);
  };
  const closeDetails = () => { setConfirmationAction(null); controller.clearSelection(); };
  const returnToListFromCalendar = () => {
    controller.setQuery({ filter: { ...controller.query.filter, dateFrom: controller.calendar.selectedDate, dateTo: controller.calendar.selectedDate } });
    setCalendarOpen(false);
  };
  const hasFilters = Boolean(controller.query.filter.dateFrom || controller.query.filter.dateTo || controller.query.filter.service || controller.query.filter.keyword || controller.query.filter.statuses.length);
  const visibleItems = controller.mobilePages.items.length ? controller.mobilePages.items : controller.items;
  const initialLoading = controller.loadState.phase === 'initial-loading' && !controller.items.length;
  const queryError = controller.loadState.phase === 'query-error' && !controller.items.length;

  return <section className="reservation-center reservation-center-ui" aria-labelledby="reservation-center-title"><header className="reservation-center__header reservation-center-ui__header"><div><p>營運管理</p><h1 id="reservation-center-title">預約中心</h1><span>{meta.description}</span></div>{controller.result ? <strong className="reservation-center-ui__result-context">{preset === 'today' && controller.query.filter.dateFrom ? controller.query.filter.dateFrom : `共 ${controller.pagination?.totalCount || 0} 筆`}</strong> : null}</header><ReservationViewSwitcher preset={preset} calendarOpen={calendarOpen} onCalendar={() => setCalendarOpen(true)} />{calendarOpen ? <ReservationCalendarView calendar={controller.calendar} filter={controller.query.filter} selectedId={controller.selection?.id} onSelect={controller.select} onDate={controller.setCalendarDate} onMode={controller.setCalendarMode} onLoad={controller.loadCalendar} onClearFilters={clearFilters} onOpenList={returnToListFromCalendar} /> : <><div className="reservation-center-ui__toolbar"><ReservationFilterControls query={controller.query} services={services} onApply={applyFilter} onSort={updateSort} /></div><details className="reservation-center-ui__mobile-filters"><summary><i className="bi bi-funnel" aria-hidden="true" />篩選與排序{hasFilters ? <b>{controller.query.filter.statuses.length + Number(Boolean(controller.query.filter.service)) + Number(Boolean(controller.query.filter.keyword)) + Number(Boolean(controller.query.filter.dateFrom || controller.query.filter.dateTo))}</b> : null}</summary><ReservationFilterControls query={controller.query} services={services} onApply={applyFilter} onSort={updateSort} /></details><ReservationFilterSummary query={controller.query} onRemove={removeFilter} onClear={clearFilters} />{controller.loadState.phase === 'refreshing' ? <p className="reservation-center-ui__refreshing" role="status"><i className="bi bi-arrow-repeat" aria-hidden="true" />正在更新預約</p> : null}{initialLoading ? <ReservationListSkeleton /> : queryError ? <ReservationErrorState state={controller.loadState} onRetry={() => { void controller.retry().catch(() => undefined); }} /> : controller.items.length === 0 ? <ReservationEmptyState preset={preset} filtered={hasFilters} onClear={clearFilters} /> : <><ReservationDesktopList items={controller.items} selectedId={controller.selection?.id} sort={controller.query.sort} onSort={toggleSort} onSelect={controller.select} onMutate={requestMutation} mutationPending={controller.mutationState.phase === 'pending'} /><ReservationMobileList items={visibleItems} selectedId={controller.selection?.id} onSelect={controller.select} onMutate={requestMutation} mutationPending={controller.mutationState.phase === 'pending'} />{controller.pagination ? <ReservationDesktopPagination pagination={controller.pagination} onPage={(page) => controller.setQuery({ page })} onPageSize={(pageSize) => controller.setQuery({ pageSize })} /> : null}<ReservationMobileLoadMore state={controller.mobilePages} onLoadMore={() => { void controller.loadMore(); }} /></>}</>}{controller.selection ? <ReservationDetailsExperience selection={controller.selection} mutationState={controller.mutationState} confirmationAction={confirmationAction} onClose={closeDetails} onRequestAction={setConfirmationAction} onCancelConfirmation={() => setConfirmationAction(null)} onConfirmAction={confirmMutation} /> : null}</section>;
}
