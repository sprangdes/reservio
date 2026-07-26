import { useEffect, useRef } from 'react';
import { useModalFocusTrap } from '../../business-operations/reservations/ui/useModalFocusTrap';

export default function UnsavedChangesDialog({ pending, onCancel, onDiscard }: Readonly<{ pending: boolean; onCancel: () => void; onDiscard: () => void }>) {
  const continueRef = useRef<HTMLButtonElement>(null); const dialogRef = useModalFocusTrap<HTMLElement>(continueRef);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onCancel(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [onCancel, pending]);
  return <div className="business-settings__dialog-layer" role="presentation"><div className="business-settings__dialog-backdrop" aria-hidden="true" /><section ref={dialogRef} className="business-settings__dialog" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-changes-title" aria-describedby="unsaved-changes-description"><h2 id="unsaved-changes-title">尚未儲存變更</h2><p id="unsaved-changes-description">離開此頁將捨棄尚未儲存的設定。</p><footer><button ref={continueRef} type="button" disabled={pending} onClick={onCancel}>繼續編輯</button><button type="button" className="is-destructive" disabled={pending} onClick={onDiscard}>{pending ? '處理中' : '捨棄變更'}</button></footer></section></div>;
}
