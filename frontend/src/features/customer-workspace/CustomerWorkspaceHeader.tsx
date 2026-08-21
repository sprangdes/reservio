import { Link, useNavigate } from 'react-router-dom';
import LogoutButton from '../../components/LogoutButton';

type CustomerWorkspaceSection = 'dashboard' | 'reservations' | 'notifications' | 'profile';

const navigation = [
  { key: 'dashboard' as const, label: '概覽', to: '/dashboard', icon: 'bi-grid-1x2' },
  { key: 'reservations' as const, label: '我的預約', to: '/my/reservations', icon: 'bi-calendar-check' },
  { key: 'notifications' as const, label: '通知', to: '/notifications', icon: 'bi-bell' },
  { key: 'profile' as const, label: '帳號', to: '/profile', icon: 'bi-person-circle' }
];

export default function CustomerWorkspaceHeader({ title, active, showBack = true, showCreate = true, showMobileNavigation = true }: Readonly<{ title: string; active?: CustomerWorkspaceSection; showBack?: boolean; showCreate?: boolean; showMobileNavigation?: boolean }>) {
  const navigate = useNavigate();
  return <><header className={`customer-workspace-header${showMobileNavigation ? ' customer-workspace-header--with-mobile-tabs' : ''}`}>
    {showBack ? <button type="button" className="customer-workspace-header__back" onClick={() => navigate(-1)} aria-label="返回上一頁"><i className="bi bi-chevron-left" aria-hidden="true" /><span>返回</span></button> : null}
    <Link className="customer-workspace-header__brand" to="/dashboard">Reservio</Link>
    <strong className="customer-workspace-header__mobile-title">{title}</strong>
    <nav aria-label="客戶導覽">
      {navigation.map((item) => <Link key={item.key} to={item.to} aria-current={item.key === active ? 'page' : undefined}>{item.label}</Link>)}
      {showCreate ? <Link to="/reservation/new" className="customer-workspace-header__create"><i className="bi bi-plus-lg" aria-hidden="true" /><span>建立預約</span></Link> : null}
      <LogoutButton className="customer-workspace-header__logout"><i className="bi bi-box-arrow-right" aria-hidden="true" /><span>登出</span></LogoutButton>
    </nav>
  </header>{showMobileNavigation ? <nav className="customer-mobile-tabbar" aria-label="客戶主要導覽">
    {navigation.slice(0, 2).map((item) => <Link key={item.key} to={item.to} aria-current={item.key === active ? 'page' : undefined}><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></Link>)}
    <Link to="/reservation/new" className="customer-mobile-tabbar__create" aria-label="建立預約"><i className="bi bi-plus-lg" aria-hidden="true" /><span>建立預約</span></Link>
    {navigation.slice(2).map((item) => <Link key={item.key} to={item.to} aria-current={item.key === active ? 'page' : undefined}><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></Link>)}
  </nav> : null}</>;
}
