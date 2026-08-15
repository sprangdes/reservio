import { Link } from 'react-router-dom';
import LogoutButton from '../../../components/LogoutButton';

export default function WorkspaceTopBar({ username }: Readonly<{ username?: string }>) {
  const formattedDate = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
  const initial = (username || '商').trim().slice(0, 1);
  return <header className="business-workspace__topbar"><p>{formattedDate}</p><div className="business-workspace__topbar-actions"><Link to="/notifications" className="business-workspace__icon-button" aria-label="前往通知中心"><i className="bi bi-bell" aria-hidden="true" /><span className="business-workspace__notification-dot" aria-hidden="true" /></Link><Link to="/profile" className="business-workspace__account" aria-label="前往帳號"><span aria-hidden="true">{initial}</span><strong>{username || '帳號'}</strong><i className="bi bi-chevron-down" aria-hidden="true" /></Link><LogoutButton className="business-workspace__logout"><i className="bi bi-box-arrow-right" aria-hidden="true" /><span>登出</span></LogoutButton></div></header>;
}
