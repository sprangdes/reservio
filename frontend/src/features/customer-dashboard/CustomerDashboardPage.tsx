import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../state/AuthContext';
import { isLocalDate } from '../customer-booking/bookingDates';
import type { ReservationSummary } from '../customer-reservations/domain';
import { normalizeReservationPage } from '../customer-reservations/normalizers';
import { getReservationStatusPresentation } from '../customer-reservations/status';
import CustomerWorkspaceHeader from '../customer-workspace/CustomerWorkspaceHeader';

type DashboardState = 'loading' | 'ready' | 'error';

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function nextReservation(items: ReservationSummary[]) {
  const now = new Date();
  const current = `${today()}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return items.filter((item) => (item.status === 'PENDING' || item.status === 'CONFIRMED') && isLocalDate(item.date) && `${item.date}T${item.startTime}` > current).sort((left, right) => `${left.date}T${left.startTime}`.localeCompare(`${right.date}T${right.startTime}`))[0] || null;
}

export default function CustomerDashboardPage() {
  const { me } = useAuth();
  const [state, setState] = useState<DashboardState>('loading');
  const [upcoming, setUpcoming] = useState<ReservationSummary | null>(null);
  const [preferredCount, setPreferredCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setState('loading');
      try {
        const [reservationResponse, preferredResponse] = await Promise.all([
          api.customerReservations({ page: 0, size: 20, sortBy: 'reservationDate', sortDir: 'asc' }, { startDate: today(), endDate: null, status: null, businessId: null, service: null, keyword: null }, { signal: controller.signal }),
          api.getPreferredBusinesses({ signal: controller.signal })
        ]);
        if (controller.signal.aborted) return;
        const page = normalizeReservationPage(reservationResponse);
        if (!page) throw new Error('Invalid reservation page');
        const preferred = preferredResponse && typeof preferredResponse === 'object' && 'data' in preferredResponse ? (preferredResponse as { data?: unknown }).data : preferredResponse;
        setUpcoming(nextReservation(page.items));
        setPreferredCount(Array.isArray(preferred) ? preferred.length : 0);
        setState('ready');
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const greeting = useMemo(() => me?.username?.trim() || '您好', [me?.username]);
  const status = upcoming ? getReservationStatusPresentation(upcoming.status) : null;

  return <main className="customer-dashboard">
    <CustomerWorkspaceHeader title="概覽" active="dashboard" showBack={false} />
    <section className="customer-dashboard__content" aria-labelledby="customer-dashboard-title">
      <header className="customer-dashboard__intro"><p>我的 Reservio</p><h1 id="customer-dashboard-title">{greeting}，今天想預約什麼服務？</h1><span>從這裡掌握下一筆預約，或快速開始新的安排。</span></header>
      <section className="customer-dashboard__primary" aria-labelledby="next-reservation-title">
        <div><p>下一個預約</p><h2 id="next-reservation-title">{state === 'loading' ? '正在取得預約資料' : upcoming ? upcoming.businessName : '目前沒有即將到來的預約'}</h2>{state === 'error' ? <span>暫時無法取得預約資料，請前往我的預約查看。</span> : upcoming ? <dl><div><dt>服務</dt><dd>{upcoming.serviceName}</dd></div><div><dt>時間</dt><dd>{upcoming.date}　{upcoming.startTime}–{upcoming.endTime}</dd></div></dl> : <span>現在就建立一筆預約，行程會顯示在這裡。</span>}</div>
        <div className="customer-dashboard__primary-actions">{status ? <span className={`customer-dashboard__status is-${status.category}`}>{status.label}</span> : null}<Link to={upcoming ? '/my/reservations' : '/reservation/new'}>{upcoming ? '查看預約' : '開始預約'}<i className="bi bi-arrow-right" aria-hidden="true" /></Link></div>
      </section>
      <section className="customer-dashboard__shortcuts" aria-label="快速功能">
        <Link to="/reservation/new"><i className="bi bi-calendar-plus" aria-hidden="true" /><span><strong>建立預約</strong><small>選擇店家、服務與時段</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></Link>
        <Link to="/my/reservations"><i className="bi bi-calendar2-check" aria-hidden="true" /><span><strong>我的預約</strong><small>查看、管理與取消預約</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></Link>
        <Link to="/preferred-businesses"><i className="bi bi-heart" aria-hidden="true" /><span><strong>想預約店家</strong><small>{state === 'ready' ? `目前已選擇 ${preferredCount} 間店家` : '管理常用店家'}</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></Link>
      </section>
    </section>
  </main>;
}
