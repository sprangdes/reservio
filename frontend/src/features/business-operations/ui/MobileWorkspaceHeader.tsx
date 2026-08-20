import { Link, useLocation } from 'react-router-dom';
import LogoutButton from '../../../components/LogoutButton';

export default function MobileWorkspaceHeader({ businessName, unreadCount }: Readonly<{ businessName?: string; unreadCount: number }>) {
  const { pathname } = useLocation();
  const pageTitle = pathname.startsWith('/reservation/') ? '預約中心' : pathname === '/' ? '營運概覽' : pathname.startsWith('/business/settings') ? '商家設定' : pathname.startsWith('/service/') ? '服務管理' : businessName || '商家工作區';
  return <header className="business-workspace__mobile-header"><div><span className="business-workspace__mobile-mark" aria-hidden="true">R</span><div><strong>{businessName || '商家工作區'}</strong><span>{pageTitle}</span></div></div><div className="business-workspace__mobile-actions"><Link to="/notifications" className="business-workspace__icon-button" aria-label="前往通知中心"><i className="bi bi-bell" aria-hidden="true" />{unreadCount > 0 ? <span className="business-workspace__notification-dot" aria-hidden="true" /> : null}</Link><LogoutButton className="business-workspace__mobile-logout"><i className="bi bi-box-arrow-right" aria-hidden="true" /><span>登出</span></LogoutButton></div></header>;
}
