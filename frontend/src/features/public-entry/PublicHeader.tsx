import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
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
    <header className="public-entry__header">
      <div className="public-entry__container public-entry__header-inner">
        <Link className="public-entry__brand" to="/" aria-label="Reservio 首頁">Reservio</Link>
        <nav className="public-entry__desktop-nav" aria-label="主要導覽">
          {items.map((item) => <Link key={item.to} className={item.emphasis === 'primary' ? 'is-primary' : ''} to={item.to}>{item.label}</Link>)}
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
      </div>
    </header>
  );
}
