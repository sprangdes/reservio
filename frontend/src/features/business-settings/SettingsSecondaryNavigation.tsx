import { Link, useLocation } from 'react-router-dom';
import { settingsRouteConfig } from './settingsRouteConfig';

const items = [settingsRouteConfig.landing, settingsRouteConfig.profile, settingsRouteConfig.booking, settingsRouteConfig.hours, settingsRouteConfig.notifications, settingsRouteConfig.line, settingsRouteConfig.account];

export default function SettingsSecondaryNavigation() {
  const { pathname } = useLocation();
  return <nav className="business-settings__secondary-nav" aria-label="商家設定導覽">
    <p>商家設定</p>
    {items.map((item) => {
      const active = pathname === item.path;
      return <Link key={item.path} to={item.path} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></Link>;
    })}
  </nav>;
}
