import { Link, useLocation } from 'react-router-dom';

const items = [
  { label: '概覽', icon: 'bi-house-door', to: '/', matches: ['/'] },
  { label: '預約', icon: 'bi-calendar2-check', to: '/reservation/manage', matches: ['/reservation/manage', '/reservation/today/manage', '/reservation/pending/manage'], calendar: false },
  { label: '行事曆', icon: 'bi-calendar3', to: '/reservation/today/manage?view=calendar', matches: ['/reservation/manage', '/reservation/today/manage', '/reservation/pending/manage'], calendar: true },
  { label: '通知', icon: 'bi-bell', to: '/notifications', matches: ['/notifications', '/notifications/settings'] },
  { label: '更多', icon: 'bi-list', to: '/business/info', matches: ['/business/info', '/business/line-integration', '/profile', '/service/manage'] }
];

export default function MobileBottomNavigation() {
  const { pathname, search } = useLocation();
  const calendarOpen = new URLSearchParams(search).get('view') === 'calendar';
  return <nav className="business-workspace__bottom-nav" aria-label="主要商家導覽">{items.map((item) => { const active = item.calendar ? calendarOpen && item.matches.includes(pathname) : item.matches.includes(pathname) && !(item.calendar === false && calendarOpen); return <Link key={item.label} to={item.to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><span className="business-workspace__bottom-icon"><i className={`bi ${item.icon}`} aria-hidden="true" />{item.label === '通知' ? <b aria-hidden="true" /> : null}</span><span>{item.label}</span></Link>; })}</nav>;
}
