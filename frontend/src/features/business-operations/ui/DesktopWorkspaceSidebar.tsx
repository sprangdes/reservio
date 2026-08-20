import { Link, useLocation } from 'react-router-dom';

type NavigationItem = {
  label: string;
  icon: string;
  to?: string;
  activePaths?: string[];
};

const primaryItems: NavigationItem[] = [
  { label: '營運概覽', icon: 'bi-bar-chart-line', to: '/', activePaths: ['/'] },
  { label: '預約中心', icon: 'bi-calendar2-check', to: '/reservation/manage', activePaths: ['/reservation/manage', '/reservation/today/manage', '/reservation/pending/manage'] },
  { label: '顧客', icon: 'bi-people' },
  { label: '服務', icon: 'bi-scissors', to: '/service/manage', activePaths: ['/service/manage', '/service/new', '/service/:id/edit'] }
];

const systemItems: NavigationItem[] = [
  { label: '商家設定', icon: 'bi-gear', to: '/business/settings', activePaths: ['/business/settings', '/business/settings/profile', '/business/settings/booking', '/business/settings/hours', '/business/settings/notifications', '/business/settings/integrations/line', '/business/settings/account'] },
  { label: '通知', icon: 'bi-bell', to: '/notifications', activePaths: ['/notifications', '/notifications/settings'] },
  { label: 'LINE 整合', icon: 'bi-line', to: '/business/settings/integrations/line', activePaths: ['/business/settings/integrations/line'] },
  { label: '帳號', icon: 'bi-person', to: '/business/settings/account', activePaths: ['/business/settings/account'] }
];

function SidebarItem({ item }: Readonly<{ item: NavigationItem }>) {
  const { pathname } = useLocation();
  const active = item.activePaths?.some((path) => path === pathname || (path.includes(':') && new RegExp(`^${path.replace(':id', '[^/]+')}$`).test(pathname))) ?? false;
  const content = <><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></>;

  if (!item.to) return null;

  return <Link className={`business-workspace__nav-link${active ? ' is-active' : ''}`} to={item.to} aria-current={active ? 'page' : undefined}>{content}</Link>;
}

function NavSection({ title, items }: Readonly<{ title: string; items: NavigationItem[] }>) {
  const visibleItems = items.filter((item) => item.to);
  if (visibleItems.length === 0) return null;
  return <section className="business-workspace__nav-section" aria-label={title}><p>{title}</p>{visibleItems.map((item) => <SidebarItem key={item.label} item={item} />)}</section>;
}

export default function DesktopWorkspaceSidebar({ businessName }: Readonly<{ businessName?: string }>) {
  return <aside className="business-workspace__sidebar" aria-label="商家工作區導覽">
    <Link to="/" className="business-workspace__brand" aria-label="Reservio 營運概覽"><span>R</span>Reservio</Link>
    <div className="business-workspace__identity"><span className="business-workspace__identity-mark"><i className="bi bi-flower1" aria-hidden="true" /></span><strong>{businessName || '商家工作區'}</strong></div>
    <nav><NavSection title="日常營運" items={primaryItems} /><NavSection title="系統" items={systemItems} /></nav>
  </aside>;
}
