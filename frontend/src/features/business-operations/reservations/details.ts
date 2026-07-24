import { getReservationStatusPresentation } from './status';
import type { ReservationAction, ReservationCenterItem } from './types';

export type ReservationMutationAction = Extract<ReservationAction, 'confirm' | 'cancel' | 'approveCancellation' | 'rejectCancellation'>;
export type ReservationTimelineSource = 'backend-supported' | 'safely-derived' | 'future-state';

export interface ReservationTimelineEntry {
  key: string;
  label: string;
  timestamp?: string;
  source: ReservationTimelineSource;
  current?: boolean;
}

export const reservationMutationLabels: Record<ReservationMutationAction, string> = {
  confirm: '確認預約',
  cancel: '取消預約',
  approveCancellation: '確認取消',
  rejectCancellation: '駁回取消申請'
};

export const reservationMutationDescriptions: Record<ReservationMutationAction, string> = {
  confirm: '確認後，這筆預約將以已確認狀態繼續安排。',
  cancel: '取消後無法直接還原這筆預約。',
  approveCancellation: '確認後，這筆預約將變更為已取消。',
  rejectCancellation: '駁回後，將保留原本已確認的預約安排。'
};

export function reservationMutationTone(action: ReservationMutationAction): 'primary' | 'destructive' | 'caution' {
  if (action === 'cancel') return 'destructive';
  if (action === 'approveCancellation') return 'caution';
  return 'primary';
}

export function createReservationStatusTimeline(item: ReservationCenterItem): ReservationTimelineEntry[] {
  const entries: ReservationTimelineEntry[] = [];
  if (item.createdAt.value) entries.push({ key: 'created', label: '已建立預約', timestamp: item.createdAt.value, source: 'safely-derived' });
  const status = getReservationStatusPresentation(item.backendStatus);
  entries.push({ key: `status-${status.key}`, label: `目前：${status.label}`, timestamp: item.updatedAt.value, source: item.updatedAt.value ? 'safely-derived' : 'backend-supported', current: true });
  return entries;
}
