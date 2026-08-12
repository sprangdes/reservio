import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { emitNotificationsChanged } from '../notificationEvents';

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

  const load = async (targetPage = page) => {
    try {
      const res = await api.notifications(targetPage, 20);
      setItems(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 0);
      setPage(targetPage);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '載入通知失敗');
    }
  };

  useEffect(() => {
    void load(0);
  }, []);

  const open = async (item: NotificationItem) => {
    if (!item.read) {
      await api.markNotificationRead(item.id);
      emitNotificationsChanged();
    }
    navigate(me?.role === 'ROLE_BUSINESS' ? '/reservation/manage' : '/my/reservations');
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    await load();
    emitNotificationsChanged();
  };

  return (
    <main className="customer-notifications-page">
      <section className="customer-notifications-page__content" aria-labelledby="notifications-title">
      <header className="customer-notifications-page__header">
        <div><p>帳號通知</p><h1 id="notifications-title">通知中心</h1><span>查看預約狀態與帳號的重要更新。</span></div>
        <button type="button" className="customer-notifications-page__read-all" onClick={() => void markAllRead()}>全部標記已讀</button>
      </header>
      <div className="customer-notifications-page__list">
        {items.map((item) => (
          <button key={item.id} type="button"
            className={`customer-notifications-page__item ${item.read ? '' : 'is-unread'}`}
            onClick={() => void open(item)}>
            <span><strong>{item.title}</strong><small>{item.content}</small></span>
            <time>{new Date(item.createdAt).toLocaleString('zh-TW')}</time>
          </button>
        ))}
        {items.length === 0 ? <div className="customer-notifications-page__empty">目前沒有通知</div> : null}
      </div>
      <nav className="customer-notifications-page__pagination" aria-label="通知頁碼"><button type="button" disabled={page <= 0} onClick={() => void load(page - 1)}>上一頁</button><button type="button" disabled={page + 1 >= totalPages} onClick={() => void load(page + 1)}>下一頁</button></nav>
      </section>
    </main>
  );
}
