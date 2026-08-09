import type { BusinessLineIntegrationHealth, BusinessLineIntegrationSettings, LineCredentialForm, LineHealthState } from '../../line/lineDomain';

const healthCopy: Record<LineHealthState['kind'], string> = { healthy: '正常', attention: '需要注意', unknown: '尚未確認', unavailable: '尚未提供' };
const healthIcon: Record<LineHealthState['kind'], string> = { healthy: 'bi-check-circle-fill', attention: 'bi-exclamation-circle-fill', unknown: 'bi-question-circle', unavailable: 'bi-dash-circle' };

export function LineIntegrationSkeleton() {
  return <section className="line-integration line-integration--skeleton" aria-busy="true" aria-label="正在載入 LINE 整合設定"><div className="line-skeleton line-skeleton--title" /><div className="line-skeleton line-skeleton--summary" /><div className="line-skeleton line-skeleton--health" /><div className="line-skeleton line-skeleton--credentials" /><div className="line-skeleton line-skeleton--webhook" /></section>;
}

export function BusinessLineConfigurationSummary({ settings, health }: Readonly<{ settings: BusinessLineIntegrationSettings; health: BusinessLineIntegrationHealth | null }>) {
  const configured = settings.configured && Boolean(settings.credentials.channelSecretMasked && settings.credentials.channelAccessTokenMasked);
  const label = settings.enabled ? '已啟用' : settings.configured ? '已停用' : '尚未設定';
  return <section className="line-integration__summary" aria-labelledby="line-configuration-summary"><div><i className={`bi ${settings.enabled ? 'bi-check-lg' : 'bi-pause-fill'}`} aria-hidden="true" /><span><strong id="line-configuration-summary">{label}</strong><small>{configured ? '憑證已儲存' : '尚未完成憑證設定'}</small></span></div><div><i className="bi bi-clock" aria-hidden="true" /><span><strong>最近檢查</strong><small>{health?.lastCheckedAt ? new Date(health.lastCheckedAt).toLocaleString('zh-TW') : '尚無最近檢查結果'}</small></span></div></section>;
}

function LineHealthRow({ label, value, detail }: Readonly<{ label: string; value: LineHealthState; detail: string }>) {
  return <li className={`line-health-row line-health-row--${value.kind}`}><i className={`bi ${healthIcon[value.kind]}`} aria-hidden="true" /><span><strong>{label} — {value.kind === 'healthy' ? detail : healthCopy[value.kind]}</strong><small>{value.message}</small></span></li>;
}

export function LineHealthList({ health }: Readonly<{ health: BusinessLineIntegrationHealth }>) {
  return <section className="line-integration__health" aria-labelledby="line-health-heading"><h2 id="line-health-heading">連線健康</h2><ul><LineHealthRow label="Webhook" value={health.webhook} detail="正常" /><LineHealthRow label="Access Token" value={health.accessToken} detail="有效" /><LineHealthRow label="Rich Menu" value={health.richMenu} detail="已建立" /></ul><p>狀態依最近一次檢查結果顯示，並非持續即時監控。</p></section>;
}

export function LineCredentialEditor({ form, settings, errors, onChange }: Readonly<{ form: LineCredentialForm & { enabled: boolean }; settings: BusinessLineIntegrationSettings; errors: Record<string, string>; onChange: <K extends keyof (LineCredentialForm & { enabled: boolean })>(key: K, value: (LineCredentialForm & { enabled: boolean })[K]) => void }>) {
  const saved = (value: string | null) => value || '尚未設定';
  return <section className="line-integration__credentials" aria-labelledby="line-credentials-heading"><header><h2 id="line-credentials-heading">憑證設定</h2><p>儲存時可更新憑證；保留空白會維持目前已儲存的值。</p></header><label>Channel ID<input value={form.channelId} aria-invalid={Boolean(errors.channelId)} aria-describedby={errors.channelId ? 'line-channel-id-error' : undefined} onChange={(event) => onChange('channelId', event.target.value)} autoComplete="off" />{errors.channelId ? <small id="line-channel-id-error" className="is-error">{errors.channelId}</small> : null}</label><label>Channel Secret<span className="line-integration__saved"><code>{saved(settings.credentials.channelSecretMasked)}</code><small>已儲存</small></span><input type="password" value={form.channelSecret} placeholder="輸入新的 Channel Secret 以取代目前設定" onChange={(event) => onChange('channelSecret', event.target.value)} autoComplete="new-password" aria-describedby="line-channel-secret-help" /><small id="line-channel-secret-help">不支援顯示既有 Secret；留空會保留目前設定。</small></label><label>Channel Access Token<span className="line-integration__saved"><code>{saved(settings.credentials.channelAccessTokenMasked)}</code><small>已儲存</small></span><input type="password" value={form.channelAccessToken} placeholder="輸入新的 Access Token 以取代目前設定" onChange={(event) => onChange('channelAccessToken', event.target.value)} autoComplete="new-password" aria-describedby="line-access-token-help" /><small id="line-access-token-help">不支援顯示既有 Token；留空會保留目前設定。</small></label><label className="line-integration__enabled"><input type="checkbox" checked={form.enabled} onChange={(event) => onChange('enabled', event.target.checked)} /><span><strong>啟用 LINE 整合</strong><small>啟用前需具備 Channel ID、Secret 與 Access Token。</small></span></label></section>;
}

export function LineWebhookSettings({ webhookUrl, onCopy, copied }: Readonly<{ webhookUrl: string | null; onCopy: () => void; copied: boolean }>) {
  return <section className="line-integration__webhook" aria-labelledby="line-webhook-heading"><header><h2 id="line-webhook-heading">Webhook 設定</h2><p>此 URL 僅用於 LINE Developers Console。</p></header><div className="line-integration__webhook-url"><code>{webhookUrl || '儲存憑證後會提供 Webhook URL'}</code><button type="button" disabled={!webhookUrl} onClick={onCopy} aria-label="複製 Webhook URL"><i className="bi bi-copy" aria-hidden="true" />複製</button></div><p className="line-integration__copy-status" role="status">{copied ? 'Webhook URL 已複製。' : ''}</p><div className="line-integration__deferred-action"><strong>Webhook 金鑰</strong><button type="button" disabled aria-describedby="line-rotate-deferred">重新產生 Webhook 金鑰</button><small id="line-rotate-deferred">此高風險操作將在確認流程完成後提供。</small></div></section>;
}

export function LineIntegrationOperations({ canTest, canProvision, pending, onTest, onProvision }: Readonly<{ canTest: boolean; canProvision: boolean; pending: 'test' | 'rich' | null; onTest: () => void; onProvision: () => void }>) {
  const richReason = canProvision ? undefined : '需先啟用整合並確認 Access Token 有效。';
  return <section className="line-integration__operations" aria-labelledby="line-operations-heading"><header><h2 id="line-operations-heading">連線與操作</h2><p>操作使用目前已儲存的設定，不會儲存未提交的憑證編輯。</p></header><div><button type="button" disabled={!canTest || pending !== null} onClick={onTest}>{pending === 'test' ? '測試中' : '測試連線'}</button><button type="button" disabled={!canProvision || pending !== null} aria-describedby={richReason ? 'line-rich-menu-reason' : undefined} onClick={onProvision}>{pending === 'rich' ? '建立中' : '建立 / 更新 Rich Menu'}</button></div>{richReason ? <small id="line-rich-menu-reason">{richReason}</small> : null}</section>;
}

export function LineIntegrationDangerZone() {
  return <section className="line-integration__danger-zone" aria-labelledby="line-disable-heading"><div><h2 id="line-disable-heading">停用 LINE 整合</h2><p>停用後 LINE 相關功能與通知將停止；憑證會保留。</p></div><button type="button" disabled aria-describedby="line-disable-deferred">停用 LINE 整合</button><small id="line-disable-deferred">此高風險操作將在確認流程完成後提供。</small></section>;
}
