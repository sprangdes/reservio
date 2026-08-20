export type LineSettingsValue = { channelId: string; channelSecretInput: string; accessTokenInput: string; hasStoredChannelSecret: boolean; hasStoredAccessToken: boolean; enabled: boolean; configured: boolean; webhookUrl: string | null };
export type LineStatusValue = { configured: boolean; enabled: boolean; webhookReady: boolean; webhookMessage: string; tokenValid: boolean; tokenMessage: string; richMenuReady: boolean; richMenuMessage: string; richMenuId: string | null; checkedAt: string | null };
export type LineSettingsPayload = { channelId: string; channelSecret: string; accessToken: string; enabled: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const masked = (value: unknown) => typeof value === 'string' && /^•{2,}/.test(value);
const text = (value: unknown) => typeof value === 'string' ? value : '';
const bool = (value: unknown) => typeof value === 'boolean' ? value : null;

export function normalizeLineSettings(source: unknown): LineSettingsValue | null {
  if (!isRecord(source) || bool(source.configured) === null || bool(source.enabled) === null) return null;
  const configured = Boolean(source.configured); const channelId = source.channelId == null ? '' : text(source.channelId);
  const secret = source.channelSecretMasked; const token = source.accessTokenMasked;
  if ((secret != null && !masked(secret)) || (token != null && !masked(token))) return null;
  if (configured && !channelId) return null;
  return { channelId, channelSecretInput: '', accessTokenInput: '', hasStoredChannelSecret: masked(secret), hasStoredAccessToken: masked(token), enabled: Boolean(source.enabled), configured, webhookUrl: typeof source.webhookUrl === 'string' && source.webhookUrl ? source.webhookUrl : null };
}

export function normalizeLineStatus(source: unknown): LineStatusValue | null {
  if (!isRecord(source)) return null;
  const flags = ['configured', 'enabled', 'webhookReady', 'tokenValid', 'richMenuReady'] as const;
  if (flags.some((key) => bool(source[key]) === null)) return null;
  return { configured: Boolean(source.configured), enabled: Boolean(source.enabled), webhookReady: Boolean(source.webhookReady), webhookMessage: text(source.webhookMessage) || '尚無最近檢查結果', tokenValid: Boolean(source.tokenValid), tokenMessage: text(source.tokenMessage) || '尚無最近檢查結果', richMenuReady: Boolean(source.richMenuReady), richMenuMessage: text(source.richMenuMessage) || '尚無最近檢查結果', richMenuId: typeof source.richMenuId === 'string' ? source.richMenuId : null, checkedAt: typeof source.checkedAt === 'string' ? source.checkedAt : null };
}

export function lineSettingsValidation(value: LineSettingsValue): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!value.channelId) errors.channelId = '請輸入 Channel ID'; else if (!value.channelId.trim()) errors.channelId = 'Channel ID 不可只有空白';
  if (value.enabled && !value.hasStoredChannelSecret && !value.channelSecretInput.trim()) errors.channelSecretInput = '請輸入 Channel Secret';
  if (value.enabled && !value.hasStoredAccessToken && !value.accessTokenInput.trim()) errors.accessTokenInput = '請輸入 Access Token';
  return errors;
}

export function lineSettingsPayload(value: LineSettingsValue): LineSettingsPayload {
  const channelSecret = value.channelSecretInput.trim();
  const accessToken = value.accessTokenInput.trim();
  if (/^•{2,}$/.test(channelSecret) || /^•{2,}$/.test(accessToken)) throw new Error('LINE_MASKED_CREDENTIAL_REJECTED');
  return { channelId: value.channelId.trim(), channelSecret, accessToken, enabled: value.enabled };
}

export function lineErrorMessage(error: unknown, action = 'save') { const raw = error instanceof Error ? error.message : ''; const lower = raw.toLowerCase(); if (lower.includes('channel id')) return '請確認 Channel ID。'; if (lower.includes('secret') || lower.includes('access token')) return '請確認 LINE 憑證設定。'; if (lower.includes('unauthorized') || lower.includes('forbidden')) return '目前帳號沒有管理 LINE 整合的權限。'; if (lower.includes('network') || lower.includes('fetch')) return '網路連線不穩，請稍後再試。'; if (lower.includes('rate')) return '操作過於頻繁，請稍後再試。'; if (action === 'test') return 'LINE 連線測試失敗，請確認已儲存的整合設定。'; if (action === 'rich') return '無法建立或更新 LINE 圖文選單，請確認已儲存的整合設定。'; return '無法完成 LINE 整合設定，請稍後再試。'; }
