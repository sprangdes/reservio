import { Link } from 'react-router-dom';
import FocusedSettingsHeader from './FocusedSettingsHeader';
import SettingsLayout from './SettingsLayout';
import { settingsRouteConfig, type SettingsRouteConfig } from './settingsRouteConfig';

const copy: Record<'landing' | 'profile' | 'booking' | 'hours' | 'notifications' | 'line' | 'account' | 'serviceNew' | 'serviceEdit', { title: string; description: string }> = {
  landing: { title: '商家設定', description: '管理商家資料、營運設定與整合服務，讓系統符合您的營運需求。' },
  profile: { title: '商家資料', description: '商家資料設定將於下一階段整合現有資料與儲存流程。' },
  booking: { title: '預約與時段', description: '預約與時段設定將於後續階段接入既有預約間隔資料。' },
  hours: { title: '營業時間', description: '營業時間設定將於後續階段接入既有時段資料。' },
  notifications: { title: '通知與溝通', description: '通知偏好目前仍可從既有通知設定頁面使用。' },
  line: { title: 'LINE 整合', description: 'LINE 整合目前仍可從既有整合頁面使用。' },
  account: { title: '帳號與安全', description: '帳號與安全目前僅顯示系統已支援的資訊。' },
  serviceNew: { title: '新增服務', description: '新增服務流程將於服務管理階段整合既有儲存流程。' },
  serviceEdit: { title: '編輯服務', description: '服務編輯將於服務管理階段提供；此頁不會載入或建立資料。' }
};

function PageHeader({ title, description }: Readonly<{ title: string; description: string }>) { return <header className="business-settings__page-header"><h1>{title}</h1><p>{description}</p></header>; }

export function SettingsLandingPage() {
  const entries = [settingsRouteConfig.profile, settingsRouteConfig.booking, settingsRouteConfig.hours, settingsRouteConfig.notifications, settingsRouteConfig.line, settingsRouteConfig.account];
  return <SettingsLayout><PageHeader {...copy.landing} /><section className="business-settings__landing-list" aria-label="設定分類">{entries.map((entry) => <Link key={entry.path} to={entry.path}><i className={`bi ${entry.icon}`} aria-hidden="true" /><span><strong>{entry.label}</strong><small>設定內容將於後續階段接入</small></span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>)}<Link to="/service/manage"><i className="bi bi-scissors" aria-hidden="true" /><span><strong>服務管理</strong><small>目前功能仍可從既有頁面使用</small></span><i className="bi bi-chevron-right" aria-hidden="true" /></Link></section></SettingsLayout>;
}

export function SettingsScaffoldPage({ page }: Readonly<{ page: keyof typeof copy }>) {
  const route = settingsRouteConfig[page] as SettingsRouteConfig;
  const isFocused = route.mobileShell === 'focused';
  const parentLabel = route.parentDestination === '/service/manage' ? '服務管理' : '商家設定';
  const body = <><PageHeader {...copy[page]} /><section className="business-settings__scaffold" aria-labelledby="settings-scaffold-heading"><h2 id="settings-scaffold-heading">{isFocused ? '設定準備中' : '設定內容'}</h2><p>{copy[page].description}</p>{page === 'profile' || page === 'booking' || page === 'hours' ? <Link to="/business/info">前往既有商家資訊頁</Link> : null}{page === 'notifications' ? <Link to="/notifications/settings">前往既有通知設定頁</Link> : null}{page === 'line' ? <Link to="/business/line-integration">前往既有 LINE 整合頁</Link> : null}</section></>;
  const content = route.desktopSecondaryNavigation ? <SettingsLayout>{body}</SettingsLayout> : <div className="business-settings business-settings--editor"><div className="business-settings__content">{body}</div></div>;
  return <>{isFocused ? <FocusedSettingsHeader parentDestination={route.parentDestination} parentLabel={parentLabel} title={copy[page].title} /> : null}{content}</>;
}

export function ServiceEditorScaffold({ editing }: Readonly<{ editing: boolean }>) { return <SettingsScaffoldPage page={editing ? 'serviceEdit' : 'serviceNew'} />; }
