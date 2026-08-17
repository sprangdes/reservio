import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { emitNotificationsChanged } from '../notificationEvents';
import { formatDateTimeToSeconds } from '../utils/time';

interface NotificationItem {
  id: number;
  reservationId?: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { me } = useAuth();
  const { setErrorMessage } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const requestGenerationRef = useRef(0);

  const load = useCallback(async (targetPage = 0) => {
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.notifications(targetPage, 20);
      if (generation !== requestGenerationRef.current) return;
      setItems(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 0);
      setPage(targetPage);
    } catch {
      if (generation !== requestGenerationRef.current) return;
      setError('暫時無法載入通知，請稍後再試。');
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
    return () => { requestGenerationRef.current += 1; };
  }, [load]);

  const open = async (item: NotificationItem) => {
    if (pending) return;
    setPending(true);
    try {
      if (!item.read) {
        await api.markNotificationRead(item.id);
        emitNotificationsChanged();
      }
      navigate(me?.role === 'ROLE_BUSINESS' ? '/reservation/manage' : '/my/reservations');
    } catch {
      setErrorMessage('暫時無法開啟通知，請稍後再試。');
    } finally {
      setPending(false);
    }
  };

  const markAllRead = async () => {
    if (pending) return;
    setPending(true);
    try {
      await api.markAllNotificationsRead();
      await load(page);
      emitNotificationsChanged();
    } catch {
      setError('暫時無法更新通知，請稍後再試。');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="customer-notifications-page">
      <section className="customer-notifications-page__content" aria-labelledby="notifications-title">
      <header className="customer-notifications-page__header">
        <div><p>帳號通知</p><h1 id="notifications-title">通知中心</h1><span>查看預約狀態與帳號的重要更新。</span></div>
        <button type="button" className="customer-notifications-page__read-all" disabled={pending || loading || items.length === 0} onClick={() => void markAllRead()}>{pending ? '處理中' : '全部標記已讀'}</button>
      </header>
      {error ? <div className="customer-notifications-page__error" role="alert"><p>{error}</p><button type="button" disabled={loading} onClick={() => void load(page)}>重新載入</button></div> : null}
      <div className="customer-notifications-page__list" aria-busy={loading}>
        {loading && items.length === 0 ? <div className="customer-notifications-page__empty" role="status">載入通知中</div> : null}
        {items.map((item) => (
          <button key={item.id} type="button" disabled={pending}
            className={`customer-notifications-page__item ${item.read ? '' : 'is-unread'}`}
            onClick={() => void open(item)}>
            <span><strong>{item.title}</strong><small>{item.content}</small></span>
            <time>{formatDateTimeToSeconds(item.createdAt)}</time>
          </button>
        ))}
        {!loading && !error && items.length === 0 ? <div className="customer-notifications-page__empty">目前沒有通知</div> : null}
      </div>
      <nav className="customer-notifications-page__pagination" aria-label="通知頁碼"><button type="button" disabled={loading || pending || page <= 0} onClick={() => void load(page - 1)}>上一頁</button><button type="button" disabled={loading || pending || page + 1 >= totalPages} onClick={() => void load(page + 1)}>下一頁</button></nav>
      </section>
    </main>
  );
}
