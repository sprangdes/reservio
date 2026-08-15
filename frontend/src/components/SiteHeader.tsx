import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function SiteHeader({ children, className = '' }: Readonly<{ children?: ReactNode; className?: string }>) {
  return <header className={`site-header${className ? ` ${className}` : ''}`}>
    <div className="site-header__inner">
      <Link className="site-header__brand" to="/" aria-label="Reservio 首頁">Reservio</Link>
      {children}
    </div>
  </header>;
}
