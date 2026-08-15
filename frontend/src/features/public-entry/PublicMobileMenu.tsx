import { useEffect, useRef, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { publicNavigationItems } from './publicNavigation';
import LogoutButton from '../../components/LogoutButton';

type PublicMobileMenuProps = {
  isCustomer: boolean;
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PublicMobileMenu({ isCustomer, open, onClose, triggerRef }: Readonly<PublicMobileMenuProps>) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const content = document.getElementById('public-entry-content');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    content?.setAttribute('inert', '');
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      content?.removeAttribute('inert');
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;
  const items = publicNavigationItems(isCustomer);
  return (
    <div id="public-mobile-menu" className="public-entry__mobile-menu" role="presentation">
      <button className="public-entry__menu-backdrop" type="button" aria-label="關閉選單" onClick={onClose} />
      <aside className="public-entry__menu-sheet" ref={dialogRef} role="dialog" aria-modal="true" aria-label="網站導覽">
        <div className="public-entry__menu-top">
          <span className="public-entry__brand">Reservio</span>
          <button ref={closeRef} className="public-entry__menu-close" type="button" aria-label="關閉選單" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="行動版網站導覽">
          <ul className="public-entry__menu-links">
            {items.map((item) => (
              <li key={item.to}>
                <Link className={item.emphasis === 'primary' ? 'is-primary' : ''} to={item.to} onClick={onClose}>
                  <span>{item.label}</span><i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {isCustomer ? <LogoutButton className="public-entry__menu-logout" onLoggedOut={onClose}><span>登出</span><i className="bi bi-box-arrow-right" aria-hidden="true" /></LogoutButton> : null}
        {!isCustomer ? <Link className="public-entry__menu-merchant" to="/register-business" onClick={onClose}>建立商家帳號</Link> : null}
      </aside>
    </div>
  );
}
