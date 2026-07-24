import { useCallback, useEffect, useRef, useState } from 'react';
import ReservationActionConfirmation from './ReservationActionConfirmation';
import ReservationDetailsDrawer from './ReservationDetailsDrawer';
import ReservationDetailsPage from './ReservationDetailsPage';
import type { ReservationMutationAction } from '../details';
import type { ReservationDetailsSelection, ReservationMutationState } from '../types';

export default function ReservationDetailsExperience({ selection, mutationState, confirmationAction, onClose, onRequestAction, onCancelConfirmation, onConfirmAction }: Readonly<{ selection: ReservationDetailsSelection; mutationState: ReservationMutationState; confirmationAction: ReservationMutationAction | null; onClose: () => void; onRequestAction: (action: ReservationMutationAction) => void; onCancelConfirmation: () => void; onConfirmAction: () => void }>) {
  const pushedRef = useRef(false);
  const closingRef = useRef(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const close = useCallback(() => {
    if (mutationState.phase === 'pending') return;
    closingRef.current = true;
    if (pushedRef.current && window.history.state?.reservationCenterDetailsId === String(selection.id)) window.history.back();
    onClose();
  }, [mutationState.phase, onClose, selection.id]);
  useEffect(() => {
    if (!window.history.state?.reservationCenterDetailsId) { window.history.pushState({ ...window.history.state, reservationCenterDetailsId: String(selection.id) }, ''); pushedRef.current = true; }
    const onPopState = () => { if (!closingRef.current) onClose(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [onClose, selection.id]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <>{mobile ? <ReservationDetailsPage item={selection.item} mutationState={mutationState} onClose={close} onAction={onRequestAction} /> : <ReservationDetailsDrawer item={selection.item} mutationState={mutationState} onClose={close} onAction={onRequestAction} />}{confirmationAction ? <ReservationActionConfirmation item={selection.item} action={confirmationAction} pending={mutationState.phase === 'pending'} error={mutationState.phase === 'error' ? mutationState.error : null} onCancel={onCancelConfirmation} onConfirm={onConfirmAction} /> : null}</>;
}
