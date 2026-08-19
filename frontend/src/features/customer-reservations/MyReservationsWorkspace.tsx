import { useMemo, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { classifyLoadedReservationPage } from './query';
import ReservationFilters from './ReservationFilters';
import ReservationRow from './ReservationRow';
import CancelReservationOverlay from './CancelReservationOverlay';
import type { ReservationSummary } from './domain';
import { ReservationEmptyState, ReservationErrorState, ReservationFilteredEmptyState, ReservationListSkeleton, ReservationStaleWarning } from './ReservationWorkspaceStates';
import { useCustomerReservationsWorkspace } from './useCustomerReservationsWorkspace';
import CustomerWorkspaceHeader from '../customer-workspace/CustomerWorkspaceHeader';

function localNow(): Readonly<{ date: string; time: string }> {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return { date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`, time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

function Section({ title, children, headingRef }: Readonly<{ title: string; children: ReactNode; headingRef?: RefObject<HTMLHeadingElement> }>) {
  return <section className="customer-reservation-workspace__section"><h2 ref={headingRef} tabIndex={-1}>{title}</h2>{children}</section>;
}

export default function MyReservationsWorkspace() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cancelling, setCancelling] = useState<ReservationSummary | null>(null);
  const workspace = useCustomerReservationsWorkspace();
  const sections = useMemo(() => {
    const now = localNow();
    return classifyLoadedReservationPage(workspace.page, now.date, now.time);
  }, [workspace.page]);
  const filtered = Object.values(workspace.applied).some((value) => value !== '' && value !== 'reservationDate' && value !== 'desc');
  const initialError = workspace.loadState === 'error' && !workspace.hasLoadedPage;
  const initialLoading = workspace.loadState === 'loading' && !workspace.hasLoadedPage;
  const successfulEmpty = workspace.loadState === 'ready' && workspace.page.totalElements === 0;
  const totalPages = Math.max(workspace.page.totalPages, 1);

  return (
    <main className="customer-reservation-workspace">
      <CustomerWorkspaceHeader title="我的預約" active="reservations" />
      <div className="customer-reservation-workspace__container">
        <header className="customer-reservation-workspace__header">
          <div><h1>我的預約</h1><p>在這裡查看與管理你的所有預約狀態。</p></div>
          <Link to="/reservation/new" className="customer-reservation-workspace__create"><i className="bi bi-plus-lg" aria-hidden="true" />建立預約</Link>
        </header>
        {initialLoading ? <ReservationListSkeleton /> : null}
        {initialError ? <ReservationErrorState onRetry={workspace.retry} /> : null}
        {successfulEmpty ? (filtered ? <ReservationFilteredEmptyState onClear={workspace.clearFilters} /> : <ReservationEmptyState />) : null}
        {workspace.hasLoadedPage && !successfulEmpty ? (
          <>
            {workspace.cancellationNotice ? <section id="reservation-cancellation-stale" className="customer-reservation-cancellation-notice" tabIndex={-1} role="status" aria-live="polite"><p>{workspace.cancellationNotice}</p></section> : null}
            {workspace.stale ? <ReservationStaleWarning onRetry={workspace.retry} /> : null}
            {sections.next ? <Section title="下一個預約"><ReservationRow reservation={sections.next} variant="next" cancellationBlocked={workspace.cancellationBlockedIds.has(sections.next.id)} onCancel={setCancelling} /></Section> : null}
            {sections.attention.length ? <Section title="需要留意">{sections.attention.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} variant="attention" cancellationBlocked={workspace.cancellationBlockedIds.has(reservation.id)} onCancel={setCancelling} />)}</Section> : null}
            <Section title="即將到來" headingRef={workspace.sectionRef}>
              {sections.upcoming.length ? sections.upcoming.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} variant="upcoming" cancellationBlocked={workspace.cancellationBlockedIds.has(reservation.id)} onCancel={setCancelling} />) : <p className="customer-reservation-workspace__quiet">此頁目前沒有其他即將到來的預約。</p>}
            </Section>
            <Section title="歷史預約">
              {sections.history.length ? <div className="customer-reservation-history">{sections.history.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} variant="history" />)}</div> : <p className="customer-reservation-workspace__quiet">此頁目前沒有歷史預約。</p>}
              <ReservationFilters open={filtersOpen} draft={workspace.draft} businesses={workspace.businesses} services={workspace.services} servicesLoading={workspace.servicesLoading} servicesError={workspace.servicesError} onToggle={() => setFiltersOpen((current) => !current)} onChange={workspace.changeDraft} onSubmit={(event) => { event.preventDefault(); workspace.applyFilters(); }} onClear={workspace.clearFilters} onRetryServices={workspace.retryServices} />
            </Section>
            <nav className="customer-reservation-pagination" aria-label="預約頁碼">
              <button type="button" aria-label="上一頁" disabled={workspace.page.page <= 0} onClick={() => workspace.changePage(workspace.page.page - 1)}><i className="bi bi-chevron-left" aria-hidden="true" /></button>
              <span aria-current="page">第 {workspace.page.page + 1} 頁，共 {totalPages} 頁</span>
              <button type="button" aria-label="下一頁" disabled={workspace.page.page + 1 >= totalPages} onClick={() => workspace.changePage(workspace.page.page + 1)}><i className="bi bi-chevron-right" aria-hidden="true" /></button>
            </nav>
            {filtered ? <p className="customer-reservation-workspace__page-note">篩選結果僅呈現目前載入的頁面。</p> : <p className="customer-reservation-workspace__page-note">各區段僅依目前載入的預約資料分類。</p>}
          </>
        ) : null}
      </div>
      {cancelling ? <CancelReservationOverlay reservation={cancelling} onClose={() => setCancelling(null)} onMutationComplete={workspace.refreshAfterCancellation} /> : null}
    </main>
  );
}
