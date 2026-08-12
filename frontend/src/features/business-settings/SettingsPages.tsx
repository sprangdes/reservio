import { Link } from 'react-router-dom';
import FocusedSettingsHeader from './FocusedSettingsHeader';
import SettingsLayout from './SettingsLayout';
import { settingsRouteConfig, type SettingsRouteConfig } from './settingsRouteConfig';
import SettingsInfrastructure from './SettingsInfrastructure';
import SettingsPageHeader from './components/SettingsPageHeader';
import { useAuth } from '../../state/AuthContext';
import { useSettingsOverview } from './hooks/useSettingsOverview';
import { businessSummary, hoursSummary, lineSummary, notificationSummary, serviceSummary } from './overview';
import { SettingsSectionError } from './components/SettingsStates';
import { BusinessProfileEditor, BookingIntervalEditor } from './Phase4Editors';
import BusinessHoursEditor from './business-hours/BusinessHoursEditor';
import ServiceEditorPage from '../service-management/ServiceEditorPage';
import NotificationSettingsEditor from './notifications/NotificationSettingsEditor';
import LineIntegrationEditor from './line/LineIntegrationEditor';
import AccountSettingsPage from './account/AccountSettingsPage';
import { accountSummary, normalizeAccountIdentity } from './account/accountSettings';

const copy: Record<'landing' | 'profile' | 'booking' | 'hours' | 'notifications' | 'line' | 'account' | 'serviceNew' | 'serviceEdit', { title: string; description: string }> = {
  landing: { title: '商家設定', description: '管理商家資料、營運設定與整合服務，讓系統符合您的營運需求。' },
  profile: { title: '商家資料', description: '管理商家對外顯示的基本資料與聯絡資訊。' },
  booking: { title: '預約與時段', description: '設定顧客可預約時段的間隔。' },
  hours: { title: '營業時間', description: '管理每週營業時間與指定日期調整。' },
  notifications: { title: '通知與溝通', description: '管理商家帳號的 Email 通知與驗證狀態。' },
  line: { title: 'LINE 整合', description: '設定 LINE Messaging API、Webhook 與 Rich Menu。' },
  account: { title: '帳號與安全', description: '帳號與安全目前僅顯示系統已支援的資訊。' },
  serviceNew: { title: '新增服務', description: '建立可供顧客預約的服務。' },
  serviceEdit: { title: '編輯服務', description: '更新服務名稱、時長與啟用狀態。' }
};

function PageHeader({ title, description }: Readonly<{ title: string; description: string }>) { return <SettingsPageHeader title={title} description={description} />; }

export function SettingsLandingPage() {
  const { me } = useAuth(); const { data, errors, retry } = useSettingsOverview(me?.business?.id); const business=businessSummary(me?.business); const hours=hoursSummary(data.slots?.defaultWeekSlots); const services=serviceSummary(data.services); const notification=notificationSummary(data.notifications); const line=lineSummary(data.lineSettings,data.lineStatus); const account=accountSummary(normalizeAccountIdentity(me)); const rows:any[]=[[settingsRouteConfig.profile,business,undefined],[settingsRouteConfig.booking,{status:'neutral',text:data.slots?.defaultInterval != null?`預約間隔 ${data.slots.defaultInterval} 分鐘`:'預約間隔暫時無法取得'},'slots'],[settingsRouteConfig.hours,hours,'slots'],[settingsRouteConfig.notifications,notification,'notifications'],[settingsRouteConfig.line,line,errors.lineStatus ? 'lineStatus' : 'lineSettings'],[settingsRouteConfig.account,account,undefined]];
  const attention: any = notification.status==='attention' ? [settingsRouteConfig.notifications,notification] : line.status==='attention' ? [settingsRouteConfig.line,line] : null;
  return <SettingsLayout><PageHeader {...copy.landing} />{attention?<Link className="business-settings__attention" to={attention[0].path}><strong>需要處理</strong><span>{attention[1].text}</span></Link>:null}<section className="business-settings__landing-list" aria-label="設定分類">{rows.map(([entry,summary,errorKey])=><div key={entry.path}>{errorKey && errors[errorKey]?<SettingsSectionError title="設定摘要可能已過期" message={errors[errorKey]} stale onRetry={()=>void retry(errorKey)}/>:<Link to={entry.path}><i className={`bi ${entry.icon}`} aria-hidden="true"/><span><strong>{entry.label}</strong><small>{summary.text}</small></span><i className="bi bi-chevron-right" aria-hidden="true"/></Link>}</div>)}{errors.services?<SettingsSectionError title="服務摘要可能已過期" message={errors.services} stale onRetry={()=>void retry('services')}/>:<Link to={settingsRouteConfig.serviceManage.path}><i className={`bi ${settingsRouteConfig.serviceManage.icon}`} aria-hidden="true"/><span><strong>{settingsRouteConfig.serviceManage.label}</strong><small>{services.text}</small></span><i className="bi bi-chevron-right" aria-hidden="true"/></Link>}</section></SettingsLayout>;
}

export function SettingsScaffoldPage({ page }: Readonly<{ page: keyof typeof copy }>) {
  const route = settingsRouteConfig[page] as SettingsRouteConfig;
  const isFocused = route.mobileShell === 'focused';
  const parentLabel = route.parentDestination === '/service/manage' ? '服務管理' : '商家設定';
  const body = page==='profile'?<BusinessProfileEditor/>:page==='booking'?<BookingIntervalEditor/>:page==='hours'?<BusinessHoursEditor/>:page==='notifications'?<NotificationSettingsEditor/>:page==='line'?<LineIntegrationEditor/>:page==='account'?<AccountSettingsPage/>:<><PageHeader {...copy[page]} /><section className="business-settings__scaffold" aria-labelledby="settings-scaffold-heading"><h2 id="settings-scaffold-heading">{isFocused ? '設定準備中' : '設定內容'}</h2><p>{copy[page].description}</p></section></>;
  const content = route.desktopSecondaryNavigation ? <SettingsLayout>{body}</SettingsLayout> : <SettingsInfrastructure><div className="business-settings business-settings--editor"><div className="business-settings__content">{body}</div></div></SettingsInfrastructure>;
  return <>{isFocused ? <FocusedSettingsHeader parentDestination={route.parentDestination} parentLabel={parentLabel} title={copy[page].title} /> : null}{content}</>;
}

export function ServiceEditorScaffold({ editing }: Readonly<{ editing: boolean }>) { return <><FocusedSettingsHeader parentDestination="/service/manage" parentLabel="服務管理" title={editing ? '編輯服務' : '新增服務'} /><SettingsInfrastructure><ServiceEditorPage editing={editing} /></SettingsInfrastructure></>; }
