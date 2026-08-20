export type NotificationPreferencesDomain = {
  email: string | null;
  emailVerified: boolean;
  emailNewReservation: boolean;
  emailStatusChanged: boolean;
  emailUpcomingReminder: boolean;
};

export type NotificationPreferencesMalformedReason =
  | 'unexpected-response'
  | 'invalid-email'
  | 'invalid-email-verified'
  | 'invalid-email-new-reservation'
  | 'invalid-email-status-changed'
  | 'invalid-email-upcoming-reminder';

export type NotificationPreferencesNormalizationResult =
  | { kind: 'valid'; value: NotificationPreferencesDomain }
  | { kind: 'missing-email'; value: NotificationPreferencesDomain }
  | { kind: 'malformed'; reason: NotificationPreferencesMalformedReason };

export type NotificationPreferenceErrorFlow = 'load' | 'save' | 'request' | 'verify';
export type NotificationPreferenceErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'unverified-email'
  | 'invalid-preference-state'
  | 'rate-limited'
  | 'network'
  | 'server'
  | 'unknown';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function missingEmail(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function validBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function hasUsableNotificationEmail(email: string | null): email is string {
  return typeof email === 'string' && emailPattern.test(email);
}

export function normalizeNotificationPreferencesDomain(value: unknown): NotificationPreferencesNormalizationResult {
  if (!isRecord(value)) {
    return { kind: 'malformed', reason: 'unexpected-response' };
  }

  if (!validBoolean(value.emailVerified)) {
    return { kind: 'malformed', reason: 'invalid-email-verified' };
  }
  if (!validBoolean(value.emailNewReservation)) {
    return { kind: 'malformed', reason: 'invalid-email-new-reservation' };
  }
  if (!validBoolean(value.emailStatusChanged)) {
    return { kind: 'malformed', reason: 'invalid-email-status-changed' };
  }
  if (!validBoolean(value.emailUpcomingReminder)) {
    return { kind: 'malformed', reason: 'invalid-email-upcoming-reminder' };
  }

  const preferenceValues = {
    emailVerified: value.emailVerified,
    emailNewReservation: value.emailNewReservation,
    emailStatusChanged: value.emailStatusChanged,
    emailUpcomingReminder: value.emailUpcomingReminder
  };

  if (missingEmail(value.email)) {
    return { kind: 'missing-email', value: { email: null, ...preferenceValues } };
  }
  if (typeof value.email !== 'string' || !hasUsableNotificationEmail(value.email)) {
    return { kind: 'malformed', reason: 'invalid-email' };
  }

  return { kind: 'valid', value: { email: value.email, ...preferenceValues } };
}

export function notificationPreferenceErrorCategory(error: unknown): NotificationPreferenceErrorCategory {
  const message = error instanceof Error ? error.message : '';
  if (/unauthorized|not authenticated|登入逾時|尚未登入/i.test(message)) return 'authentication';
  if (/forbidden|權限|無權/i.test(message)) return 'authorization';
  if (/請先驗證 Email|email.*not verified|email.*未驗證/i.test(message)) return 'unverified-email';
  if (/通知設定資料不完整|notification preferences?.*(malformed|invalid|incomplete)/i.test(message)) return 'invalid-preference-state';
  if (/頻繁|rate limit|too many requests/i.test(message)) return 'rate-limited';
  if (/network|failed to fetch|networkerror/i.test(message)) return 'network';
  if (/server|internal error|服務暫時/i.test(message)) return 'server';
  return 'unknown';
}

export function notificationPreferenceErrorMessage(
  error: unknown,
  flow: NotificationPreferenceErrorFlow = 'load'
): string {
  switch (notificationPreferenceErrorCategory(error)) {
    case 'authentication':
    case 'authorization':
      return '目前帳號沒有管理通知設定的權限。';
    case 'unverified-email':
      return '完成 Email 驗證後，才能啟用 Email 通知。';
    case 'invalid-preference-state':
      return '通知設定資料不完整，請重新載入後再試。';
    case 'rate-limited':
      return '操作過於頻繁，請稍後再試。';
    case 'network':
      return '網路連線失敗，請確認連線後重試。';
    case 'server':
    case 'unknown':
      if (flow === 'verify') return '驗證碼無效或已失效，請確認後再試。';
      return {
        load: '暫時無法取得通知設定，請稍後再試。',
        save: '儲存通知設定失敗，請稍後再試。',
        request: '寄送驗證碼失敗，請稍後再試。',
        verify: 'Email 驗證失敗，請稍後再試。'
      }[flow];
  }
}
