import { useState } from 'react';
import { resolveReservationActionCapabilities } from '../capabilities';
import type { ReservationAction, ReservationCenterItem } from '../types';

const labels: Record<Exclude<ReservationAction, 'retryMutation'>, string> = { viewDetails: '查看選取資訊', confirm: '確認預約', cancel: '取消預約', inspectCancellationReason: '查看取消原因', approveCancellation: '確認取消', rejectCancellation: '駁回取消申請' };
type MutationAction = 'confirm' | 'cancel' | 'approveCancellation' | 'rejectCancellation';
const mutationActions: MutationAction[] = ['confirm', 'cancel', 'approveCancellation', 'rejectCancellation'];

export default function ReservationActionMenu({ item, onSelect, onMutate, mutationPending }: Readonly<{ item: ReservationCenterItem; onSelect: () => void; onMutate: (action: MutationAction) => void; mutationPending: boolean }>) {
  const [open, setOpen] = useState(false);
  const capabilities = resolveReservationActionCapabilities(item);
  const primary = mutationActions.find((action) => capabilities[action].availability === 'available');
  const run = (action: MutationAction) => { setOpen(false); onMutate(action); };
  return <div className="reservation-action-menu" onClick={(event) => event.stopPropagation()}>{primary ? <button type="button" className={`reservation-action-menu__primary${primary === 'cancel' || primary === 'approveCancellation' ? ' is-caution' : ''}`} disabled={mutationPending} onClick={() => run(primary)}>{mutationPending ? '處理中' : labels[primary]}</button> : <button type="button" className="reservation-action-menu__select" onClick={onSelect}>查看</button>}<button type="button" className="reservation-action-menu__toggle" aria-label="更多預約操作" aria-expanded={open} onClick={() => setOpen((value) => !value)}><i className="bi bi-three-dots-vertical" aria-hidden="true" /></button>{open ? <div className="reservation-action-menu__options" role="menu"><button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect(); }}>{labels.viewDetails}</button>{mutationActions.filter((action) => action !== primary && capabilities[action].availability === 'available').map((action) => <button type="button" role="menuitem" key={action} disabled={mutationPending} onClick={() => run(action)}>{labels[action]}</button>)}{capabilities.inspectCancellationReason.availability === 'available' ? <button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect(); }}>{labels.inspectCancellationReason}</button> : null}</div> : null}</div>;
}
