import { resolveReservationActionCapabilities } from '../capabilities';
import { reservationMutationLabels, reservationMutationTone } from '../details';
import type { ReservationMutationAction } from '../details';
import type { ReservationCenterItem, ReservationMutationState } from '../types';

const actionOrder: ReservationMutationAction[] = ['confirm', 'approveCancellation', 'rejectCancellation', 'cancel'];

export default function ReservationDetailsActions({ item, mutationState, onAction }: Readonly<{ item: ReservationCenterItem; mutationState: ReservationMutationState; onAction: (action: ReservationMutationAction) => void }>) {
  const capabilities = resolveReservationActionCapabilities(item, mutationState.phase === 'error');
  const available = actionOrder.filter((action) => capabilities[action].availability === 'available');
  if (!available.length) return null;
  const primary = available.find((action) => reservationMutationTone(action) === 'primary') || available[0];
  return <footer className="reservation-details__actions" aria-label="預約操作"><button type="button" className={`reservation-details__action reservation-details__action--${reservationMutationTone(primary)}`} disabled={mutationState.phase === 'pending'} onClick={() => onAction(primary)}>{mutationState.phase === 'pending' && mutationState.action === primary ? '處理中' : reservationMutationLabels[primary]}</button>{available.filter((action) => action !== primary).map((action) => <button key={action} type="button" className={`reservation-details__action reservation-details__action--${reservationMutationTone(action)}`} disabled={mutationState.phase === 'pending'} onClick={() => onAction(action)}>{reservationMutationLabels[action]}</button>)}</footer>;
}
