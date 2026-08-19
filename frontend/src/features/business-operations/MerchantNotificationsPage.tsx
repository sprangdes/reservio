import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { emitNotificationsChanged } from '../../notificationEvents';
import { useToast } from '../../state/ToastContext';
import { formatDateTimeToSeconds } from '../../utils/time';

interface NotificationItem {
  id: number;
  reservationId?: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export default function MerchantNotificationsPage() {
  const { setErrorMessage, setSuccessMessage } = useToast();
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
      navigate(item.reservationId ? `/reservation/manage?reservationId=${item.reservationId}` : '/reservation/manage');
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
      setSuccessMessage('已將所有通知標記為已讀。');
    } catch {
      setError('暫時無法更新通知，請稍後再試。');
    } finally {
      setPending(false);
    }
  };

  return <section className="merchant-notifications" aria-labelledby="merchant-notifications-title">
    <header className="merchant-notifications__header"><div><p>營運通知</p><h1 id="merchant-notifications-title">通知中心</h1><span>掌握預約與帳號的重要更新。</span></div><button type="button" disabled={pending || loading || items.length === 0} onClick={() => void markAllRead()}><i className="bi bi-check2-all" aria-hidden="true" />{pending ? '處理中' : '全部標記已讀'}</button></header>
    {error ? <div className="merchant-notifications__error" role="alert"><span><i className="bi bi-exclamation-circle" aria-hidden="true" />{error}</span><button type="button" disabled={loading} onClick={() => void load(page)}>重新載入</button></div> : null}
    <section className="merchant-notifications__panel" aria-busy={loading} aria-label="通知列表">
      {loading && items.length === 0 ? <div className="merchant-notifications__empty" role="status">載入通知中</div> : null}
      {items.map((item) => <button key={item.id} type="button" disabled={pending} className={`merchant-notifications__item ${item.read ? '' : 'is-unread'}`} onClick={() => void open(item)}><i className={`bi ${item.read ? 'bi-envelope-open' : 'bi-envelope-fill'}`} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.content}</small></span><time>{formatDateTimeToSeconds(item.createdAt)}</time><i className="bi bi-chevron-right" aria-hidden="true" /></button>)}
      {!loading && !error && items.length === 0 ? <div className="merchant-notifications__empty"><i className="bi bi-bell-slash" aria-hidden="true" />目前沒有通知</div> : null}
    </section>
    {totalPages > 1 ? <nav className="merchant-notifications__pagination" aria-label="通知頁碼"><button type="button" disabled={loading || pending || page <= 0} onClick={() => void load(page - 1)}>上一頁</button><span>第 {page + 1} 頁，共 {totalPages} 頁</span><button type="button" disabled={loading || pending || page + 1 >= totalPages} onClick={() => void load(page + 1)}>下一頁</button></nav> : null}
  </section>;
}
