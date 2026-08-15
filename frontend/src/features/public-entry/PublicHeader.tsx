import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../../components/SiteHeader';
import { publicNavigationItems } from './publicNavigation';
import LogoutButton from '../../components/LogoutButton';

type PublicHeaderProps = {
  isCustomer: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
};

export default function PublicHeader({ isCustomer, menuOpen, onOpenMenu, triggerRef }: Readonly<PublicHeaderProps>) {
  const items = publicNavigationItems(isCustomer);
  return (
    <SiteHeader className="public-entry__header">
        <nav className="public-entry__desktop-nav" aria-label="主要導覽">
          {items.map((item) => <Link key={item.to} className={item.emphasis === 'primary' ? 'is-primary' : ''} to={item.to} state={item.reservationLoginNotice ? { reservationLoginNotice: true } : undefined}>{item.label}</Link>)}
          {isCustomer ? <LogoutButton className="public-entry__logout" /> : null}
        </nav>
        <button
          ref={triggerRef}
          className="public-entry__menu-trigger"
          type="button"
          aria-label="開啟選單"
          aria-expanded={menuOpen}
          aria-controls="public-mobile-menu"
          onClick={onOpenMenu}
        >
          <i className="bi bi-list" aria-hidden="true" />
        </button>
    </SiteHeader>
  );
}
