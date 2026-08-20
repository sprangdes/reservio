import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';
import { reservationCenterAdapter } from '../reservations/data/reservationCenterAdapter';
import { createOverviewPendingQuery, type OperationsOverviewData, type OverviewNotification } from '../overview';
import type { ReservationCenterAdapter, ReservationLoadState } from '../reservations/types';

type NotificationsApi = {
  notificationUnreadCount(): Promise<any>;
  notifications(page?: number, size?: number): Promise<any>;
};

const idle: ReservationLoadState = { phase: 'idle', error: null, hasStaleData: false };

function normalizeNotifications(response: any): OverviewNotification[] {
  const values = response?.data?.content || response?.content || [];
  if (!Array.isArray(values)) return [];
  return values.filter((item) => item && (typeof item.id === 'string' || typeof item.id === 'number')).map((item) => ({
    id: item.id,
    title: typeof item.title === 'string' ? item.title : '通知',
    content: typeof item.content === 'string' ? item.content : '',
    read: Boolean(item.read),
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    reservationId: typeof item.reservationId === 'string' || typeof item.reservationId === 'number' ? item.reservationId : undefined
  }));
}

export function useOperationsOverview({ adapter = reservationCenterAdapter, notificationsApi = api, now }: Readonly<{ adapter?: ReservationCenterAdapter; notificationsApi?: NotificationsApi; now?: Date }> = {}) {
  const [data, setData] = useState<OperationsOverviewData>({ pending: null, notifications: [], unreadCount: 0 });
  const [pendingState, setPendingState] = useState<ReservationLoadState>(idle);
  const [notificationState, setNotificationState] = useState<ReservationLoadState>(idle);
  const requestRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  const refresh = useCallback(async (mode: 'initial' | 'refresh' | 'retry' = 'initial') => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setPendingState(() => ({ phase: mode === 'refresh' && dataRef.current.pending ? 'refreshing' : 'initial-loading', error: null, hasStaleData: Boolean(dataRef.current.pending) }));
    setNotificationState(() => ({ phase: mode === 'refresh' && dataRef.current.notifications.length ? 'refreshing' : 'initial-loading', error: null, hasStaleData: Boolean(dataRef.current.notifications.length) }));
    const [pendingResult, unreadResult, notificationResult] = await Promise.allSettled([
      adapter.query(createOverviewPendingQuery(now)), notificationsApi.notificationUnreadCount(), notificationsApi.notifications(0, 5)
    ]);
    if (requestRef.current !== requestId) return;
    if (pendingResult.status === 'fulfilled') {
      setData((current) => ({ ...current, pending: pendingResult.value }));
      setPendingState({ phase: pendingResult.value.items.length ? 'ready' : 'empty', error: null, hasStaleData: false });
    } else setPendingState((current) => ({ phase: 'query-error', error: pendingResult.reason instanceof Error ? pendingResult.reason : new Error('載入待處理預約失敗'), hasStaleData: current.hasStaleData }));
    if (unreadResult.status === 'fulfilled' && notificationResult.status === 'fulfilled') {
      setData((current) => ({ ...current, unreadCount: Number(unreadResult.value?.data?.count || 0), notifications: normalizeNotifications(notificationResult.value) }));
      setNotificationState({ phase: notificationResult.value?.data?.content?.length ? 'ready' : 'empty', error: null, hasStaleData: false });
    } else setNotificationState((current) => ({ phase: 'query-error', error: new Error('載入通知摘要失敗'), hasStaleData: current.hasStaleData }));
  }, [adapter, notificationsApi, now]);

  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => {
    const onNotificationsChanged = () => { void refresh('refresh').catch(() => undefined); };
    globalThis.addEventListener('reservio:notifications-changed', onNotificationsChanged);
    return () => globalThis.removeEventListener('reservio:notifications-changed', onNotificationsChanged);
  }, [refresh]);

  return { data, pendingState, notificationState, refresh, retryPending: () => refresh('retry'), retryNotifications: () => refresh('retry') };
}
