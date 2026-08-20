import { useEffect, useRef } from 'react';
import { useModalFocusTrap } from '../../../business-operations/reservations/ui/useModalFocusTrap';
export default function DateOverrideDeleteDialog({ pending, onCancel, onDelete }: Readonly<{ pending: boolean; onCancel: () => void; onDelete: () => void }>) {
  const cancelRef = useRef<HTMLButtonElement>(null); const dialogRef = useModalFocusTrap<HTMLElement>(cancelRef);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onCancel(); }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener); }, [onCancel, pending]);
  return <div className="business-settings__dialog-layer" role="presentation"><div className="business-settings__dialog-backdrop" aria-hidden="true"/><section ref={dialogRef} className="business-settings__dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-date-override-title" aria-describedby="delete-date-override-description"><h2 id="delete-date-override-title">刪除指定日期設定？</h2><p id="delete-date-override-description">刪除後，這一天將恢復使用每週營業時間。</p><footer><button ref={cancelRef} type="button" disabled={pending} onClick={onCancel}>取消</button><button type="button" className="is-destructive" disabled={pending} onClick={onDelete}>{pending ? '刪除中' : '刪除設定'}</button></footer></section></div>;
}
