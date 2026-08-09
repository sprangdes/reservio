import type { ReservationStatusKey, ReservationStatusPresentation } from './domain';

const presentations: Record<ReservationStatusKey, ReservationStatusPresentation> = {
  PENDING: { key: 'PENDING', label: '等待店家確認', category: 'attention' },
  CONFIRMED: { key: 'CONFIRMED', label: '已確認', category: 'confirmed' },
  CANCEL_REQUESTED: { key: 'CANCEL_REQUESTED', label: '取消申請處理中', category: 'attention' },
  CANCELLED: { key: 'CANCELLED', label: '已取消', category: 'terminal-destructive' },
  COMPLETED: { key: 'COMPLETED', label: '已完成', category: 'terminal-complete' },
  UNKNOWN: { key: 'UNKNOWN', label: '狀態待確認', category: 'unknown' }
};

export function normalizeReservationStatus(value: unknown): ReservationStatusKey {
  return typeof value === 'string' && value in presentations && value !== 'UNKNOWN' ? value as ReservationStatusKey : 'UNKNOWN';
}

export function getReservationStatusPresentation(value: unknown): ReservationStatusPresentation {
  return presentations[normalizeReservationStatus(value)];
}
