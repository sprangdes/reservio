import type { BackendReservationStatus, ReservationStatusKey, ReservationStatusPresentation } from './types';

const views = (today: boolean, pending: boolean, all = true, calendar = false) => ({ today, pending, all, calendar });

export const reservationStatusPresentations: Readonly<Record<ReservationStatusKey, ReservationStatusPresentation>> = {
  PENDING: { key: 'PENDING', label: '待確認', tone: 'warning', icon: 'hourglass-split', terminal: false, source: 'backend', includedIn: views(true, true) },
  CONFIRMED: { key: 'CONFIRMED', label: '已確認', tone: 'success', icon: 'check-circle', terminal: false, source: 'backend', includedIn: views(true, false, true, true) },
  CANCEL_REQUESTED: { key: 'CANCEL_REQUESTED', label: '取消申請中', tone: 'warning', icon: 'clock-history', terminal: false, source: 'backend', includedIn: views(true, true) },
  CANCELLED: { key: 'CANCELLED', label: '已取消', tone: 'danger', icon: 'x-circle', terminal: true, source: 'backend', includedIn: views(false, false) },
  COMPLETED: { key: 'COMPLETED', label: '已完成', tone: 'info', icon: 'flag', terminal: true, source: 'backend', includedIn: views(true, false, true, true) },
  REJECTED: { key: 'REJECTED', label: '已駁回', tone: 'danger', icon: 'slash-circle', terminal: true, source: 'future', includedIn: views(false, false) },
  UNKNOWN: { key: 'UNKNOWN', label: '狀態未支援', tone: 'neutral', icon: 'question-circle', terminal: false, source: 'unknown', includedIn: views(false, false) }
};

const backendStatuses = new Set<BackendReservationStatus>(['PENDING', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'COMPLETED']);

export function normalizeReservationStatus(status: unknown): ReservationStatusKey {
  const candidate = typeof status === 'string' ? status.trim().toUpperCase() : '';
  return backendStatuses.has(candidate as BackendReservationStatus) ? candidate as BackendReservationStatus : 'UNKNOWN';
}

export function getReservationStatusPresentation(status: unknown): ReservationStatusPresentation {
  return reservationStatusPresentations[normalizeReservationStatus(status)];
}
