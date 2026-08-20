import { useEffect, useRef } from 'react';
import { useModalFocusTrap } from '../business-operations/reservations/ui/useModalFocusTrap';
import type { LinkedLineBusiness } from './lineDomain';

export function LineBusinessUnlinkDialog({ item, pending, error, onCancel, onConfirm }: Readonly<{ item: LinkedLineBusiness; pending: boolean; error: string; onCancel: () => void; onConfirm: () => void }>) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalFocusTrap<HTMLElement>(cancelRef);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, pending]);

  useEffect(() => {
    const layer = layerRef.current;
    const parent = layer?.parentElement;
    if (!layer || !parent) return;
    const siblings = Array.from(parent.children).filter((node): node is HTMLElement => node !== layer && node instanceof HTMLElement);
    const previous = siblings.map((element) => ({ element, ariaHidden: element.getAttribute('aria-hidden'), inert: element.inert }));
    siblings.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    return () => previous.forEach(({ element, ariaHidden, inert }) => { element.inert = inert; if (ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', ariaHidden); });
  }, []);

  return <div ref={layerRef} className="line-account-links__confirmation" role="presentation">
    <div className="line-account-links__backdrop" aria-hidden="true" />
    <section ref={dialogRef} className="line-account-links__dialog" role="alertdialog" aria-modal="true" aria-labelledby="line-unlink-title" aria-describedby="line-unlink-description">
      <span className="line-account-links__dialog-handle" aria-hidden="true" />
      <div className="line-account-links__dialog-icon" aria-hidden="true"><i className="bi bi-link-45deg" /></div>
      <h2 id="line-unlink-title">解除與 {item.businessName} 的 LINE 綁定？</h2>
      <p id="line-unlink-description">解除後，未來這個商家的 LINE 預約將不再關聯到目前 Reservio 帳號。已經轉移到帳號中的既有預約不會自動移回。</p>
      <p className="line-account-links__dialog-notice"><i className="bi bi-exclamation-triangle" aria-hidden="true" />此操作無法復原，解除後需由商家重新發起綁定。</p>
      {error ? <p className="line-account-links__dialog-error" role="alert">{error}</p> : null}
      <footer><button ref={cancelRef} type="button" disabled={pending} onClick={onCancel}>取消</button><button type="button" className="is-destructive" disabled={pending} onClick={onConfirm}>{pending ? '解除中' : '解除綁定'}</button></footer>
      <p className="line-account-links__dialog-lock"><i className="bi bi-lock" aria-hidden="true" />開啟此視窗時，背景無法操作。</p>
    </section>
  </div>;
}
