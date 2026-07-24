import { Link, useLocation } from 'react-router-dom';

const items = [
  { label: '概覽', icon: 'bi-house-door', to: '/', matches: ['/'] },
  { label: '預約', icon: 'bi-calendar2-check', to: '/reservation/manage', matches: ['/reservation/manage', '/reservation/today/manage', '/reservation/pending/manage'] },
  { label: '通知', icon: 'bi-bell', to: '/notifications', matches: ['/notifications', '/notifications/settings'] },
  { label: '更多', icon: 'bi-list', to: '/business/info', matches: ['/business/info', '/business/line-integration', '/profile', '/service/manage'] }
];

export default function MobileBottomNavigation() {
  const { pathname } = useLocation();
  return <nav className="business-workspace__bottom-nav" aria-label="主要商家導覽">{items.map((item) => { const active = item.matches.includes(pathname); return <Link key={item.label} to={item.to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><span className="business-workspace__bottom-icon"><i className={`bi ${item.icon}`} aria-hidden="true" />{item.label === '通知' ? <b aria-label="有通知提醒" /> : null}</span><span>{item.label}</span></Link>; })}</nav>;
}
