import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { formatLocalDateZhTw, formatLocalTimeRange } from '../customer-booking/bookingDates';
import { requiresCancellationReason } from './capabilities';
import { cancellationSuccessMessage, mapReservationCancellation } from './cancellation';
import type { ReservationSummary } from './domain';
import { useModalFocusTrap } from '../business-operations/reservations/ui/useModalFocusTrap';

type SubmitResult = 'refreshed' | 'stale';

export default function CancelReservationOverlay({ reservation, onClose, onMutationComplete }: Readonly<{ reservation: ReservationSummary; onClose: () => void; onMutationComplete: (reservation: ReservationSummary, message: string) => Promise<SubmitResult> }>) {
  const needsReason = requiresCancellationReason(reservation.status);
  const returnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalFocusTrap<HTMLElement>(returnRef);
  const layerRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'refreshing'>('idle');
  const pending = phase !== 'idle';
  const title = needsReason ? '送出取消申請？' : '取消這筆預約？';
  const description = needsReason
    ? '此預約已由店家確認。送出後，店家需要處理你的取消申請；在店家確認前，預約狀態會顯示為「取消申請處理中」。'
    : '這筆預約尚未由店家確認。取消後將立即標記為已取消。';
  const submitLabel = needsReason ? '送出取消申請' : '取消預約';
  const pendingLabel = needsReason ? '正在送出取消申請…' : '正在取消預約…';

  useEffect(() => {
    const parent = layerRef.current?.parentElement;
    if (!parent || !layerRef.current) return;
    const siblings = Array.from(parent.children).filter((element) => element !== layerRef.current) as HTMLElement[];
    const previous = siblings.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }));
    siblings.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    return () => previous.forEach(({ element, inert, ariaHidden }) => { element.inert = inert; if (ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', ariaHidden); });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, pending]);

  const close = () => { if (!pending) onClose(); };
  const submit = async () => {
    if (pending) return;
    const payload = mapReservationCancellation(reservation, reason);
    if (!payload) { setReasonError('請輸入取消原因。'); return; }
    setReasonError(''); setMutationError(''); setPhase('submitting');
    try { await api.cancelReservation(reservation.id, payload); }
    catch { setMutationError('暫時無法處理取消操作，請稍後再試。'); setPhase('idle'); return; }
    setPhase('refreshing');
    await onMutationComplete(reservation, cancellationSuccessMessage(reservation));
    setReason('');
    onClose();
  };

  return <div ref={layerRef} className="customer-cancellation-layer" role="presentation">
    <button type="button" className="customer-cancellation-layer__backdrop" aria-label="關閉取消預約視窗" disabled={pending} onClick={close} />
    <section ref={dialogRef} className="customer-cancellation" role="alertdialog" aria-modal="true" aria-labelledby="customer-cancellation-title" aria-describedby="customer-cancellation-description">
      <div className="customer-cancellation__handle" aria-hidden="true" />
      <h2 id="customer-cancellation-title">{title}</h2>
      <p id="customer-cancellation-description" className="customer-cancellation__description">{description}</p>
      <div className="customer-cancellation__context" aria-label="取消預約內容"><strong>{reservation.businessName}</strong><span>{reservation.serviceName}</span><time dateTime={reservation.date}>{formatLocalDateZhTw(reservation.date)}</time><span>{formatLocalTimeRange(reservation.startTime, reservation.endTime)}</span></div>
      {needsReason ? <div className="customer-cancellation__notice"><i className="bi bi-info-circle" aria-hidden="true" />店家處理前，預約狀態會顯示為「取消申請處理中」。</div> : null}
      {needsReason ? <label className="customer-cancellation__field" htmlFor="customer-cancellation-reason">取消原因<textarea id="customer-cancellation-reason" value={reason} placeholder="請簡要說明取消原因" disabled={pending} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? 'customer-cancellation-reason-error' : undefined} onChange={(event) => { setReason(event.target.value); if (reasonError) setReasonError(''); }} /></label> : null}
      {reasonError ? <p id="customer-cancellation-reason-error" className="customer-cancellation__error" role="alert">{reasonError}</p> : null}
      {mutationError ? <p className="customer-cancellation__error" role="alert">{mutationError}</p> : null}
      <footer><button ref={returnRef} type="button" disabled={pending} onClick={close}>返回</button><button type="button" className="is-destructive" disabled={pending} aria-busy={pending} onClick={() => void submit()}>{pending ? pendingLabel : submitLabel}</button></footer>
      <p className="customer-cancellation__live" role="status" aria-live="polite">{pending ? pendingLabel : ''}</p>
    </section>
  </div>;
}
