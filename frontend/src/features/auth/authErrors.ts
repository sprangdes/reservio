import { ApiError } from '../../api';
import { isUnauthorizedError } from '../../sessionEvents';

export type AuthErrorCategory =
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'DUPLICATE_IDENTITY'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'OTP_INVALID_OR_EXPIRED'
  | 'NETWORK'
  | 'SERVER'
  | 'UNKNOWN';

export type AuthErrorContext = 'login' | 'customer-registration' | 'merchant-registration' | 'otp-request' | 'otp-verify' | 'force-change';

export type NormalizedAuthError = {
  category: AuthErrorCategory;
  message: string;
};

const messages: Record<AuthErrorCategory, string> = {
  VALIDATION: '請確認輸入資料後再試。',
  INVALID_CREDENTIALS: '使用者名稱或密碼不正確，請再試一次。',
  DUPLICATE_IDENTITY: '無法使用此帳號資料，請調整後重試。',
  RATE_LIMITED: '嘗試過於頻繁，請稍後再試。',
  SESSION_EXPIRED: '登入已逾時，請重新登入。',
  OTP_INVALID_OR_EXPIRED: '驗證碼無效、已過期或無法再使用，請重新取得驗證碼。',
  NETWORK: '無法連線，請確認網路後重試。',
  SERVER: '系統暫時無法完成操作，請稍後再試。',
  UNKNOWN: '無法完成操作，請稍後再試。'
};

export function normalizeAuthError(error: unknown, context?: AuthErrorContext): NormalizedAuthError {
  if (isUnauthorizedError(error)) return { category: 'SESSION_EXPIRED', message: messages.SESSION_EXPIRED };
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return { category: context === 'login' ? 'INVALID_CREDENTIALS' : 'SESSION_EXPIRED', message: messages[context === 'login' ? 'INVALID_CREDENTIALS' : 'SESSION_EXPIRED'] };
    }
    if (error.status === 429) return { category: 'RATE_LIMITED', message: messages.RATE_LIMITED };
    if (error.status >= 500) return { category: 'SERVER', message: messages.SERVER };
    if (error.status === 400 && context === 'otp-verify') return { category: 'OTP_INVALID_OR_EXPIRED', message: messages.OTP_INVALID_OR_EXPIRED };
    if (error.status === 400 && (context === 'customer-registration' || context === 'merchant-registration')) {
      return { category: 'DUPLICATE_IDENTITY', message: messages.DUPLICATE_IDENTITY };
    }
    if (error.status === 400) return { category: 'VALIDATION', message: messages.VALIDATION };
  }
  if (error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message))) {
    return { category: 'NETWORK', message: messages.NETWORK };
  }
  return { category: 'UNKNOWN', message: messages.UNKNOWN };
}
