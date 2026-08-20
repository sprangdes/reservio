export type AccountIdentityValue = { displayName: string | null; email: string | null; emailVerified: boolean | null; roleLabel: string | null; mustChangePassword: boolean | null };
export type AccountSettingsCapabilities = { canEditProfile: boolean; canChangePassword: boolean; canChangeEmail: boolean; canChangePhone: boolean; canManageMfa: boolean; canManageSessions: boolean; canDeleteAccount: boolean };
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const value = (source: Record<string, unknown>, key: string) => source[key];

export function normalizeAccountIdentity(source: unknown): AccountIdentityValue | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const raw = source as Record<string, unknown>; const username = value(raw, 'username'); const email = value(raw, 'email'); const verified = value(raw, 'emailVerified'); const role = value(raw, 'role'); const password = value(raw, 'mustChangePassword');
  if (username != null && (typeof username !== 'string' || !username.trim())) return null;
  if (email != null && (typeof email !== 'string' || !validEmail.test(email))) return null;
  if (verified != null && typeof verified !== 'boolean') return null;
  if (role != null && typeof role !== 'string') return null;
  if (password != null && typeof password !== 'boolean') return null;
  return { displayName: typeof username === 'string' ? username : null, email: typeof email === 'string' ? email : null, emailVerified: typeof verified === 'boolean' ? verified : null, roleLabel: role === 'ROLE_BUSINESS' ? '商家帳號' : role === 'ROLE_USER' ? '客戶帳號' : null, mustChangePassword: typeof password === 'boolean' ? password : null };
}

export function accountSettingsCapabilities(role: unknown): AccountSettingsCapabilities { const isCustomer = role === 'ROLE_USER'; return { canEditProfile: isCustomer, canChangePassword: false, canChangeEmail: isCustomer, canChangePhone: false, canManageMfa: false, canManageSessions: false, canDeleteAccount: false }; }
export function accountEmailStatus(identity: AccountIdentityValue) { if (!identity.email) return { status: 'unavailable' as const, text: 'Email 資料暫時無法取得' }; if (identity.emailVerified === true) return { status: 'complete' as const, text: 'Email 已驗證' }; if (identity.emailVerified === false) return { status: 'attention' as const, text: 'Email 尚未驗證' }; return { status: 'neutral' as const, text: 'Email 驗證狀態暫時無法取得' }; }
export function accountSummary(identity: AccountIdentityValue | null) { if (!identity) return { status: 'unavailable' as const, text: '帳號資料暫時無法取得' }; if (identity.mustChangePassword) return { status: 'attention' as const, text: '需要完成強制密碼變更' }; return accountEmailStatus(identity); }
