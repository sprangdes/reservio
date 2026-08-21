import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { label: '概覽', icon: 'bi-house-door', to: '/', matches: ['/'] },
  { label: '預約', icon: 'bi-calendar2-check', to: '/reservation/manage', matches: ['/reservation/manage', '/reservation/today/manage', '/reservation/pending/manage'], calendar: false },
  { label: '行事曆', icon: 'bi-calendar3', to: '/reservation/today/manage?view=calendar', matches: ['/reservation/manage', '/reservation/today/manage', '/reservation/pending/manage'], calendar: true },
  { label: '通知', icon: 'bi-bell', to: '/notifications', matches: ['/notifications', '/notifications/settings'] },
  { label: '更多', icon: 'bi-list', to: '/business/settings', matches: ['/business/settings', '/business/info', '/business/settings/integrations/line', '/business/line-integration', '/profile', '/service/manage'] }
];

export default function MobileBottomNavigation() {
  const { pathname, search } = useLocation();
  const [hidden, setHidden] = useState(false);
  const calendarOpen = new URLSearchParams(search).get('view') === 'calendar';

  useEffect(() => {
    let previousScrollY = window.scrollY;
    let frameId: number | null = null;
    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - previousScrollY;
        if (currentScrollY <= 0) setHidden(false);
        else if (delta > 8) setHidden(true);
        else if (delta < -8) setHidden(false);
        previousScrollY = currentScrollY;
        frameId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <nav className={`business-workspace__bottom-nav${hidden ? ' is-hidden' : ''}`} aria-label="主要商家導覽">{items.map((item) => { const active = item.calendar ? calendarOpen && item.matches.includes(pathname) : item.matches.includes(pathname) && !(item.calendar === false && calendarOpen); return <Link key={item.label} to={item.to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><span className="business-workspace__bottom-icon"><i className={`bi ${item.icon}`} aria-hidden="true" />{item.label === '通知' ? <b aria-hidden="true" /> : null}</span><span>{item.label}</span></Link>; })}</nav>;
}
