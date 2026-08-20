import type { ReservationViewPreset } from './types';

export const reservationRoutePresets: Readonly<Record<string, Exclude<ReservationViewPreset, 'calendar'>>> = {
  '/reservation/today/manage': 'today',
  '/reservation/pending/manage': 'pending',
  '/reservation/manage': 'all'
};

export const reservationPresetRoutes: Readonly<Record<Exclude<ReservationViewPreset, 'calendar'>, string>> = {
  today: '/reservation/today/manage',
  pending: '/reservation/pending/manage',
  all: '/reservation/manage'
};

export function getReservationPresetForPath(pathname: string): Exclude<ReservationViewPreset, 'calendar'> {
  return reservationRoutePresets[pathname] || 'all';
}

export function isCanonicalReservationRoute(pathname: string): boolean { return Object.prototype.hasOwnProperty.call(reservationRoutePresets, pathname); }
export function getReservationRouteForPreset(preset: Exclude<ReservationViewPreset, 'calendar'>): string { return reservationPresetRoutes[preset]; }
