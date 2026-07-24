import { useEffect, useRef } from 'react';
import { reservationMutationDescriptions, reservationMutationLabels, reservationMutationTone } from '../details';
import type { ReservationMutationAction } from '../details';
import type { ReservationCenterItem } from '../types';

export default function ReservationActionConfirmation({ item, action, pending, error, onCancel, onConfirm }: Readonly<{ item: ReservationCenterItem; action: ReservationMutationAction; pending: boolean; error?: Error | null; onCancel: () => void; onConfirm: () => void }>) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, pending]);
  const title = reservationMutationLabels[action];
  return <div className="reservation-confirmation" role="presentation"><div className="reservation-confirmation__backdrop" aria-hidden="true" /><section className="reservation-confirmation__dialog" role="alertdialog" aria-modal="true" aria-labelledby="reservation-confirmation-title" aria-describedby="reservation-confirmation-description"><header><p>請確認操作</p><h2 id="reservation-confirmation-title">{title}</h2></header><p id="reservation-confirmation-description">{reservationMutationDescriptions[action]}</p><dl><div><dt>顧客</dt><dd>{item.customerName.value || '未提供顧客名稱'}</dd></div><div><dt>預約時間</dt><dd>{item.reservationDate.value || '未提供日期'} {item.startTime.value?.slice(0, 5) || ''}</dd></div></dl>{error ? <p className="reservation-confirmation__error" role="alert">{error.message || '更新預約失敗'}</p> : null}<footer><button type="button" disabled={pending} onClick={onCancel}>返回</button><button ref={confirmRef} type="button" className={`is-${reservationMutationTone(action)}`} disabled={pending} onClick={onConfirm}>{pending ? '處理中' : title}</button></footer></section></div>;
}
