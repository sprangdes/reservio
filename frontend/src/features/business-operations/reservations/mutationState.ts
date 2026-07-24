import type { ReservationAction, ReservationMutationState } from './types';

export const initialReservationMutationState: ReservationMutationState = { phase: 'idle', error: null };
export function reservationMutationPending(id: string | number, action: ReservationAction): ReservationMutationState { return { phase: 'pending', reservationId: id, action, error: null }; }
export function reservationMutationSuccess(id: string | number, action: ReservationAction): ReservationMutationState { return { phase: 'success', reservationId: id, action, error: null, updatedAt: Date.now() }; }
export function reservationMutationError(id: string | number, action: ReservationAction, error: Error): ReservationMutationState { return { phase: 'error', reservationId: id, action, error }; }
export function reservationMutationStale(state: ReservationMutationState): ReservationMutationState { return state.phase === 'success' ? { ...state, phase: 'stale' } : state; }
