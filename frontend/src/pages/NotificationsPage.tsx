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
    <main className="container list-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">通知中心</h2>
        <button className="btn btn-outline-primary btn-sm" onClick={() => void markAllRead()}>全部標記已讀</button>
      </div>
      <div className="list-group shadow-sm">
        {items.map((item) => (
          <button key={item.id} type="button"
            className={`list-group-item list-group-item-action text-start ${item.read ? '' : 'fw-bold bg-light'}`}
            onClick={() => void open(item)}>
            <div className="d-flex justify-content-between gap-3">
              <span>{item.title}</span>
              <small className="text-muted">{new Date(item.createdAt).toLocaleString('zh-TW')}</small>
            </div>
            <div className="small text-muted mt-1">{item.content}</div>
          </button>
        ))}
        {items.length === 0 ? <div className="list-group-item text-muted text-center py-5">目前沒有通知</div> : null}
      </div>
      <div className="d-flex justify-content-center gap-2 mt-4">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 0} onClick={() => void load(page - 1)}>上一頁</button>
        <button className="btn btn-outline-secondary btn-sm" disabled={page + 1 >= totalPages} onClick={() => void load(page + 1)}>下一頁</button>
      </div>
    </main>
  );
}
