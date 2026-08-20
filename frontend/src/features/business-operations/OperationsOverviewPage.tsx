import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { isActionableException, nextUpcomingReservation, todayAgendaPreview, todaySummary } from './overview';
import { useOperationsOverview } from './hooks/useOperationsOverview';
import { useReservationCenter } from './reservations/hooks/useReservationCenter';
import ReservationDetailsExperience from './reservations/ui/ReservationDetailsExperience';
import type { ReservationMutationAction } from './reservations/details';
import type { ReservationCenterItem } from './reservations/types';
import { NextReservationPanel, NotificationSummary, OperationalAlerts, PendingWorkSection, TodayAgendaPreview, TodaySummary } from './ui/OperationsOverviewSections';

export default function OperationsOverviewPage() {
  const { me } = useAuth();
  const { setSuccessMessage } = useToast();
  const todayController = useReservationCenter({ preset: 'today' });
  const overview = useOperationsOverview();
  const [confirmationAction, setConfirmationAction] = useState<ReservationMutationAction | null>(null);
  const todayLoading = todayController.loadState.phase === 'initial-loading' && !todayController.items.length;
  const pendingItems = overview.data.pending?.items || [];
  const next = useMemo(() => nextUpcomingReservation(todayController.items), [todayController.items]);
  const agenda = useMemo(() => todayAgendaPreview(todayController.items), [todayController.items]);
  const summary = todaySummary(todayController.result, overview.data.pending);
  const cancellationCount = pendingItems.filter(isActionableException).length;
  const select = (item: ReservationCenterItem) => todayController.select(item);
  const requestAction = (item: ReservationCenterItem, action: ReservationMutationAction) => { select(item); setConfirmationAction(action); };
  const closeDetails = () => { setConfirmationAction(null); todayController.clearSelection(); };
  const confirmAction = () => {
    const item = todayController.selection?.item;
    if (!item || !confirmationAction || todayController.mutationState.phase === 'pending') return;
    void todayController.mutate(item, confirmationAction).then(async () => {
      setConfirmationAction(null);
      setSuccessMessage('預約狀態已更新。');
      await overview.refresh('refresh');
    }).catch(() => undefined);
  };
  const stale = todayController.loadState.phase === 'query-error' && todayController.loadState.hasStaleData || overview.pendingState.phase === 'query-error' && overview.pendingState.hasStaleData || overview.notificationState.phase === 'query-error' && overview.notificationState.hasStaleData;

  return <section className="operations-overview operations-overview-ui" aria-labelledby="operations-overview-title">
    <header className="operations-overview-ui__header"><div><p>{me?.business?.name || '商家工作區'}</p><h1 id="operations-overview-title">營運概覽</h1><span>先處理需要決定的預約，再掌握今天的排程。</span></div><Link to="/reservation/manage" className="operations-overview-ui__reservation-link">前往預約中心 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></header>
    {stale ? <div className="operations-overview-ui__stale" role="status"><i className="bi bi-arrow-repeat" aria-hidden="true" />部分營運資料尚未完成更新，正在顯示先前資料。<button type="button" onClick={() => { void Promise.all([todayController.refresh().catch(() => undefined), overview.refresh('refresh').catch(() => undefined)]); }}>重試</button></div> : null}
    <div className="operations-overview-ui__layout">
      <PendingWorkSection items={pendingItems} state={overview.pendingState} onSelect={select} onAction={requestAction} onRetry={() => { void overview.retryPending().catch(() => undefined); }} />
      <aside className="operations-overview-ui__side" aria-label="今日營運摘要"><NextReservationPanel item={next} loading={todayLoading} onSelect={select} /><TodaySummary todayCount={summary.todayCount} pendingCount={summary.pendingCount} /></aside>
      <TodayAgendaPreview items={agenda} loading={todayLoading} onSelect={select} />
      <aside className="operations-overview-ui__secondary" aria-label="營運提醒與通知"><OperationalAlerts cancellationCount={cancellationCount} failed={overview.pendingState.phase === 'query-error'} /><NotificationSummary notifications={overview.data.notifications} unreadCount={overview.data.unreadCount} state={overview.notificationState} onRetry={() => { void overview.retryNotifications().catch(() => undefined); }} /></aside>
    </div>
    {todayController.selection ? <ReservationDetailsExperience selection={todayController.selection} mutationState={todayController.mutationState} confirmationAction={confirmationAction} onClose={closeDetails} onRequestAction={setConfirmationAction} onCancelConfirmation={() => setConfirmationAction(null)} onConfirmAction={confirmAction} /> : null}
  </section>;
}
