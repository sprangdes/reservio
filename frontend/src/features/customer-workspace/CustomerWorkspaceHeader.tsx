import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  const [mobileHeaderOffset, setMobileHeaderOffset] = useState(0);
  const [mobileTabbarHidden, setMobileTabbarHidden] = useState(false);
  const mobileHeaderOffsetRef = useRef(0);

  useEffect(() => {
    if (!showMobileNavigation) return;
    let previousScrollY = window.scrollY;
    let previousTimestamp = performance.now();
    let frameId: number | null = null;
    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - previousScrollY;
        const timestamp = performance.now();
        const scrollSpeed = Math.abs(delta) / Math.max(timestamp - previousTimestamp, 1);
        const remainingScrollDistance = document.documentElement.scrollHeight - (currentScrollY + window.innerHeight);
        let nextOffset = mobileHeaderOffsetRef.current;
        if (currentScrollY <= 0) nextOffset = 0;
        else if (delta > 0 && remainingScrollDistance > 96) nextOffset = Math.min(72, nextOffset + delta);
        else if (delta < 0 && (currentScrollY < 120 || scrollSpeed >= .45)) nextOffset = Math.max(0, nextOffset + delta);
        if (nextOffset !== mobileHeaderOffsetRef.current) {
          mobileHeaderOffsetRef.current = nextOffset;
          setMobileHeaderOffset(nextOffset);
        }
        if (currentScrollY <= 0) setMobileTabbarHidden(false);
        else if (delta > 8) setMobileTabbarHidden(true);
        else if (delta < -8) setMobileTabbarHidden(false);
        previousScrollY = currentScrollY;
        previousTimestamp = timestamp;
        frameId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [showMobileNavigation]);

  const headerStyle = { '--customer-mobile-header-offset': `${mobileHeaderOffset}px` } as CSSProperties;

  return <><header className={`customer-workspace-header${showMobileNavigation ? ' customer-workspace-header--with-mobile-tabs' : ''}${mobileHeaderOffset > 8 ? ' is-mobile-collapsed' : ''}`} style={headerStyle}>
    {showBack ? <button type="button" className="customer-workspace-header__back" onClick={() => navigate(-1)} aria-label="返回上一頁"><i className="bi bi-chevron-left" aria-hidden="true" /><span>返回</span></button> : null}
    <Link className="customer-workspace-header__brand" to="/dashboard">Reservio</Link>
    <strong className="customer-workspace-header__mobile-title">{title}</strong>
    <nav aria-label="客戶導覽">
      {navigation.map((item) => <Link key={item.key} to={item.to} aria-current={item.key === active ? 'page' : undefined}>{item.label}</Link>)}
      {showCreate ? <Link to="/reservation/new" className="customer-workspace-header__create"><i className="bi bi-plus-lg" aria-hidden="true" /><span>建立預約</span></Link> : null}
      <LogoutButton className="customer-workspace-header__logout"><i className="bi bi-box-arrow-right" aria-hidden="true" /><span>登出</span></LogoutButton>
    </nav>
  </header>{showMobileNavigation ? <nav className={`customer-mobile-tabbar${mobileTabbarHidden ? ' is-hidden' : ''}`} aria-label="客戶主要導覽">
    {navigation.slice(0, 2).map((item) => <Link key={item.key} to={item.to} aria-current={item.key === active ? 'page' : undefined}><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></Link>)}
    <Link to="/reservation/new" className="customer-mobile-tabbar__create" aria-label="建立預約"><i className="bi bi-plus-lg" aria-hidden="true" /><span>建立預約</span></Link>
    {navigation.slice(2).map((item) => <Link key={item.key} to={item.to} aria-current={item.key === active ? 'page' : undefined}><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></Link>)}
  </nav> : null}</>;
}
