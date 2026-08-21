import { useLocation } from 'react-router-dom';
import LogoutButton from '../../../components/LogoutButton';

export default function MobileWorkspaceHeader({ businessName }: Readonly<{ businessName?: string }>) {
  const { pathname } = useLocation();
  const pageTitle = pathname.startsWith('/reservation/') ? '預約中心' : pathname === '/' ? '營運概覽' : pathname.startsWith('/business/settings') ? '商家設定' : pathname.startsWith('/service/') ? '服務管理' : businessName || '商家工作區';
  return <header className="business-workspace__mobile-header"><div><span className="business-workspace__mobile-mark" aria-hidden="true">R</span><div><strong>{businessName || '商家工作區'}</strong><span>{pageTitle}</span></div></div><div className="business-workspace__mobile-actions"><LogoutButton className="business-workspace__mobile-logout"><i className="bi bi-box-arrow-right" aria-hidden="true" /><span>登出</span></LogoutButton></div></header>;
}
