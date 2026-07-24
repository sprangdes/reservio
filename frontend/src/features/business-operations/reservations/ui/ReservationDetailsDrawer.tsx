import { useEffect, useRef } from 'react';
import ReservationDetailsActions from './ReservationDetailsActions';
import ReservationDetailsContent from './ReservationDetailsContent';
import ReservationMutationFeedback from './ReservationMutationFeedback';
import type { ReservationMutationAction } from '../details';
import type { ReservationCenterItem, ReservationMutationState } from '../types';

export default function ReservationDetailsDrawer({ item, mutationState, onClose, onAction }: Readonly<{ item: ReservationCenterItem; mutationState: ReservationMutationState; onClose: () => void; onAction: (action: ReservationMutationAction) => void }>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; closeRef.current?.focus(); return () => openerRef.current?.focus(); }, []);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && mutationState.phase !== 'pending') onClose(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [mutationState.phase, onClose]);
  return <div className="reservation-details-drawer" role="presentation"><button type="button" className="reservation-details-drawer__backdrop" aria-label="關閉預約詳情" disabled={mutationState.phase === 'pending'} onClick={onClose} /><aside className="reservation-details-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="reservation-details-title"><div className="reservation-details-drawer__top"><span>預約詳情</span><button ref={closeRef} type="button" aria-label="關閉預約詳情" disabled={mutationState.phase === 'pending'} onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /></button></div><ReservationDetailsContent item={item} /><ReservationMutationFeedback state={mutationState} /><ReservationDetailsActions item={item} mutationState={mutationState} onAction={onAction} /></aside></div>;
}
