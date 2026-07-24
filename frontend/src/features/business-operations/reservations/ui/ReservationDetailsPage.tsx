import { useEffect, useRef } from 'react';
import ReservationDetailsActions from './ReservationDetailsActions';
import ReservationDetailsContent from './ReservationDetailsContent';
import ReservationMutationFeedback from './ReservationMutationFeedback';
import type { ReservationMutationAction } from '../details';
import type { ReservationCenterItem, ReservationMutationState } from '../types';

export default function ReservationDetailsPage({ item, mutationState, onClose, onAction }: Readonly<{ item: ReservationCenterItem; mutationState: ReservationMutationState; onClose: () => void; onAction: (action: ReservationMutationAction) => void }>) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && mutationState.phase !== 'pending') onClose(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [mutationState.phase, onClose]);
  return <section className="reservation-details-page" role="dialog" aria-modal="true" aria-labelledby="reservation-details-title"><header className="reservation-details-page__top"><button ref={backRef} type="button" aria-label="返回預約中心" disabled={mutationState.phase === 'pending'} onClick={onClose}><i className="bi bi-arrow-left" aria-hidden="true" /></button><strong>預約詳情</strong><span aria-hidden="true" /></header><div className="reservation-details-page__body"><ReservationDetailsContent item={item} /><ReservationMutationFeedback state={mutationState} /></div><ReservationDetailsActions item={item} mutationState={mutationState} onAction={onAction} /></section>;
}
