import { Link, useLocation } from 'react-router-dom';

export default function MobileWorkspaceHeader({ businessName }: Readonly<{ businessName?: string }>) {
  const { pathname } = useLocation();
  const pageTitle = pathname.startsWith('/reservation/') ? '預約中心' : pathname === '/' ? '營運概覽' : businessName || '商家工作區';
  return <header className="business-workspace__mobile-header"><div><span className="business-workspace__mobile-mark" aria-hidden="true">R</span><div><strong>{businessName || '商家工作區'}</strong><span>{pageTitle}</span></div></div><Link to="/notifications" className="business-workspace__icon-button" aria-label="前往通知中心"><i className="bi bi-bell" aria-hidden="true" /><span className="business-workspace__notification-dot" aria-hidden="true" /></Link></header>;
}
