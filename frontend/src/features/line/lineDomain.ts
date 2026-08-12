export type LineApiResponse<T> = { data: T };

export type BusinessLineIntegrationSettings = {
  configured: boolean;
  enabled: boolean;
  credentials: {
    channelId: string | null;
    channelSecretMasked: string | null;
    channelAccessTokenMasked: string | null;
  };
  webhookUrl: string | null;
};

export type LineHealthKind = 'healthy' | 'attention' | 'unknown' | 'unavailable';
export type LineHealthState = { kind: LineHealthKind; message: string; checkedAt: string | null };
export type BusinessLineIntegrationHealth = {
  configured: boolean;
  enabled: boolean;
  lastCheckedAt: string | null;
  webhook: LineHealthState;
  accessToken: LineHealthState;
  richMenu: LineHealthState;
};
export type BusinessLineIntegrationDomain = BusinessLineIntegrationSettings & { health: BusinessLineIntegrationHealth };

export type LineCredentialForm = {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
};
export type LineCredentialUpdateRequest = { channelId: string; channelSecret: string; accessToken: string; enabled: boolean };

export type LineAccountLinkState = 'created' | 'awaiting-line' | 'completed' | 'failed' | 'expired';
export type LineAccountLinkRequest = { businessName: string; state: LineAccountLinkState; expiresAt: string };
export type LinkedLineBusiness = { businessName: string; linkedAt: string; unlinkId: number };
export type LineLoadState<T> =
  | { phase: 'loading'; data: null; stale: false }
  | { phase: 'ready'; data: T; stale: false }
  | { phase: 'error'; data: null; stale: false }
  | { phase: 'stale'; data: T; stale: true }
  | { phase: 'malformed'; data: null; stale: false };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const stringOrNull = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null;
const booleanOrNull = (value: unknown): boolean | null => typeof value === 'boolean' ? value : null;
const maskedCredential = (value: unknown): string | null => typeof value === 'string' && /^•{2,}/.test(value) ? value : null;
const isMaskedPlaceholder = (value: string): boolean => /^•{2,}$/.test(value.trim());

function normalizeHealth(ready: unknown, message: unknown, checkedAt: string | null, configured: boolean, enabled: boolean): LineHealthState | null {
  if (booleanOrNull(ready) === null) return null;
  const text = stringOrNull(message) || '尚無最近檢查結果';
  if (!configured || !enabled) return { kind: 'unavailable', message: text, checkedAt };
  return { kind: ready ? 'healthy' : checkedAt ? 'attention' : 'unknown', message: text, checkedAt };
}

export function normalizeBusinessLineIntegrationSettings(source: unknown): BusinessLineIntegrationSettings | null {
  if (!isRecord(source)) return null;
  const configured = booleanOrNull(source.configured);
  const enabled = booleanOrNull(source.enabled);
  if (configured === null || enabled === null) return null;
  const channelId = source.channelId == null ? null : stringOrNull(source.channelId);
  const channelSecretMasked = source.channelSecretMasked == null ? null : maskedCredential(source.channelSecretMasked);
  const channelAccessTokenMasked = source.accessTokenMasked == null ? null : maskedCredential(source.accessTokenMasked);
  if ((source.channelSecretMasked != null && !channelSecretMasked) || (source.accessTokenMasked != null && !channelAccessTokenMasked)) return null;
  if (configured && !channelId) return null;
  return { configured, enabled, credentials: { channelId, channelSecretMasked, channelAccessTokenMasked }, webhookUrl: source.webhookUrl == null ? null : stringOrNull(source.webhookUrl) };
}

export function normalizeBusinessLineIntegrationHealth(source: unknown): BusinessLineIntegrationHealth | null {
  if (!isRecord(source)) return null;
  const configured = booleanOrNull(source.configured);
  const enabled = booleanOrNull(source.enabled);
  if (configured === null || enabled === null) return null;
  const lastCheckedAt = source.checkedAt == null ? null : stringOrNull(source.checkedAt);
  const webhook = normalizeHealth(source.webhookReady, source.webhookMessage, lastCheckedAt, configured, enabled);
  const accessToken = normalizeHealth(source.tokenValid, source.tokenMessage, lastCheckedAt, configured, enabled);
  const richMenu = normalizeHealth(source.richMenuReady, source.richMenuMessage, lastCheckedAt, configured, enabled);
  return webhook && accessToken && richMenu ? { configured, enabled, lastCheckedAt, webhook, accessToken, richMenu } : null;
}

export function normalizeBusinessLineIntegration(settingsSource: unknown, healthSource: unknown): BusinessLineIntegrationDomain | null {
  const settings = normalizeBusinessLineIntegrationSettings(settingsSource);
  const health = normalizeBusinessLineIntegrationHealth(healthSource);
  if (!settings || !health || settings.configured !== health.configured || settings.enabled !== health.enabled) return null;
  return { ...settings, health };
}

export function createLineCredentialForm(settings: BusinessLineIntegrationSettings): LineCredentialForm {
  return { channelId: settings.credentials.channelId || '', channelSecret: '', channelAccessToken: '' };
}

export function mapLineCredentialUpdate(form: LineCredentialForm, settings: BusinessLineIntegrationSettings, enabled: boolean): LineCredentialUpdateRequest {
  const channelId = form.channelId.trim();
  const channelSecret = form.channelSecret.trim();
  const accessToken = form.channelAccessToken.trim();
  if (!channelId) throw new Error('LINE_CHANNEL_ID_REQUIRED');
  if (isMaskedPlaceholder(channelSecret) || isMaskedPlaceholder(accessToken)) throw new Error('LINE_MASKED_CREDENTIAL_REJECTED');
  if (enabled && !settings.credentials.channelSecretMasked && !channelSecret) throw new Error('LINE_CHANNEL_SECRET_REQUIRED');
  if (enabled && !settings.credentials.channelAccessTokenMasked && !accessToken) throw new Error('LINE_ACCESS_TOKEN_REQUIRED');
  return { channelId, channelSecret, accessToken, enabled };
}

export function hasSavedLineCredentials(settings: BusinessLineIntegrationSettings): boolean {
  return Boolean(settings.credentials.channelId && settings.credentials.channelSecretMasked && settings.credentials.channelAccessTokenMasked);
}
export function canTestLineConnection(settings: BusinessLineIntegrationSettings): boolean { return settings.configured && settings.enabled && hasSavedLineCredentials(settings); }
export function canProvisionRichMenu(settings: BusinessLineIntegrationSettings, health: BusinessLineIntegrationHealth): boolean { return canTestLineConnection(settings) && health.accessToken.kind === 'healthy'; }
export function canRotateWebhookKey(settings: BusinessLineIntegrationSettings): boolean { return settings.configured && hasSavedLineCredentials(settings); }
export function canDisableLineIntegration(settings: BusinessLineIntegrationSettings): boolean { return settings.configured && settings.enabled; }

const accountLinkStates: Record<string, LineAccountLinkState> = { CREATED: 'created', AWAITING_LINE: 'awaiting-line', COMPLETED: 'completed', FAILED: 'failed', EXPIRED: 'expired' };
export function normalizeLineAccountLinkRequest(source: unknown): LineAccountLinkRequest | null {
  if (!isRecord(source)) return null;
  const businessName = stringOrNull(source.businessName);
  const status = typeof source.status === 'string' ? accountLinkStates[source.status] : undefined;
  const expiresAt = stringOrNull(source.expiresAt);
  return businessName && status && expiresAt ? { businessName, state: status, expiresAt } : null;
}

export type AccountLinkRequestToken = { value: string };
export function parseAccountLinkRequestToken(search: string): AccountLinkRequestToken | null {
  const params = new URLSearchParams(search);
  const values = params.getAll('request');
  if (values.length !== 1) return null;
  const value = values[0].trim();
  return /^[A-Za-z0-9_-]{16,512}$/.test(value) ? { value } : null;
}

export function validateLineAccountLinkHandoff(source: unknown): string | null {
  if (typeof source !== 'string') return null;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && url.hostname === 'access.line.me' && url.pathname === '/dialog/bot/accountLink' && url.searchParams.has('linkToken') && url.searchParams.has('nonce') ? url.toString() : null;
  } catch { return null; }
}

export function normalizeLinkedLineBusinesses(source: unknown): LinkedLineBusiness[] | null {
  if (!Array.isArray(source)) return null;
  const rows = source.map((value): LinkedLineBusiness | null => {
    if (!isRecord(value) || typeof value.lineCustomerId !== 'number' || !Number.isSafeInteger(value.lineCustomerId) || value.lineCustomerId < 1) return null;
    const businessName = stringOrNull(value.businessName);
    const linkedAt = stringOrNull(value.linkedAt);
    return businessName && linkedAt ? { businessName, linkedAt, unlinkId: value.lineCustomerId } : null;
  });
  return rows.every((row): row is LinkedLineBusiness => row !== null) ? rows : null;
}

export function mapLineBusinessUnlinkInput(item: Pick<LinkedLineBusiness, 'unlinkId'>): number {
  if (!Number.isSafeInteger(item.unlinkId) || item.unlinkId < 1) throw new Error('LINE_UNLINK_IDENTIFIER_INVALID');
  return item.unlinkId;
}

export type LineErrorCategory = 'authentication' | 'authorization' | 'merchant-access' | 'invalid-configuration' | 'provider' | 'network' | 'invalid-request' | 'malformed-data' | 'server' | 'unknown';
export function lineErrorCategory(error: unknown): LineErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('unauthorized')) return 'authentication';
  if (message.includes('forbidden')) return 'authorization';
  if (message.includes('非商家') || message.includes('business access')) return 'merchant-access';
  if (message.includes('provider') || message.includes('linktoken')) return 'provider';
  if (message.includes('channel id') || message.includes('secret') || message.includes('access token')) return 'invalid-configuration';
  if (message.includes('network') || message.includes('fetch')) return 'network';
  if (message.includes('expired') || message.includes('過期') || message.includes('找不到') || message.includes('帳號綁定')) return 'invalid-request';
  if (message.includes('line')) return 'provider';
  if (message.includes('malformed') || message.includes('invalid data')) return 'malformed-data';
  if (message.includes('server') || message.includes('500')) return 'server';
  return 'unknown';
}

export function lineSafeErrorMessage(error: unknown): string {
  switch (lineErrorCategory(error)) {
    case 'authentication': return '請先登入後再繼續。';
    case 'authorization': case 'merchant-access': return '目前帳號沒有執行此操作的權限。';
    case 'invalid-configuration': return '請確認 LINE 整合設定。';
    case 'provider': return 'LINE 服務暫時無法完成此操作，請稍後再試。';
    case 'network': return '網路連線失敗，請確認連線後重試。';
    case 'invalid-request': return '此 LINE 帳號綁定連結無效、已使用或已過期。';
    case 'malformed-data': return '收到的 LINE 資料格式不正確，請稍後重試。';
    case 'server': return '伺服器暫時無法完成此操作，請稍後再試。';
    default: return '暫時無法完成 LINE 操作，請稍後再試。';
  }
}
