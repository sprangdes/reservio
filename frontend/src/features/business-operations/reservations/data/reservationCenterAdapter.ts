import { api } from '../../../../api';
import { toBackendReservationQuery } from '../query';
import { mapReservationPage } from './reservationMappers';
import type { ReservationCenterAdapter, ReservationQuery } from '../types';

type BusinessReservationApi = { businessReservations(params: { page: number; size: number; sortBy: string; sortDir: string }, condition: unknown): Promise<unknown>; updateReservationStatus(id: string | number, payload: { action: string }): Promise<unknown>; };
const mutationActions = { confirm: 'confirm', cancel: 'cancel', approveCancellation: 'approveCancel', rejectCancellation: 'rejectCancel' } as const;

export function createReservationCenterAdapter(client: BusinessReservationApi = api): ReservationCenterAdapter {
  return {
    async query(query: ReservationQuery) {
      const request = toBackendReservationQuery(query);
      const response = await client.businessReservations({ page: request.page, size: request.size, sortBy: request.sortBy, sortDir: request.sortDir }, request.condition);
      return mapReservationPage(response, request.page, request.size);
    },
    mutate(id, action) {
      const backendAction = mutationActions[action as keyof typeof mutationActions];
      if (!backendAction) throw new Error('目前不支援此預約操作');
      return client.updateReservationStatus(id, { action: backendAction });
    }
  };
}

export const reservationCenterAdapter = createReservationCenterAdapter();
