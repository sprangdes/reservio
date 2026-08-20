import {
  normalizeNotificationPreferencesDomain,
  notificationPreferenceErrorMessage,
  type NotificationPreferenceErrorFlow
} from '../../notification-preferences/notificationPreferencesDomain';

export type NotificationPreferencesValue = { email: string; emailVerified: boolean; emailNewReservation: boolean; emailStatusChanged: boolean; emailUpcomingReminder: boolean };
export type PreferenceFormValue = Pick<NotificationPreferencesValue, 'emailNewReservation' | 'emailStatusChanged' | 'emailUpcomingReminder'>;
export function normalizeNotificationPreferences(value: unknown): NotificationPreferencesValue | undefined { const normalized = normalizeNotificationPreferencesDomain(value); if (normalized.kind !== 'valid') return undefined; return { email: normalized.value.email, emailVerified: normalized.value.emailVerified, emailNewReservation: normalized.value.emailNewReservation, emailStatusChanged: normalized.value.emailStatusChanged, emailUpcomingReminder: normalized.value.emailUpcomingReminder }; }
export function preferenceForm(value: NotificationPreferencesValue): PreferenceFormValue { return { emailNewReservation: value.emailNewReservation, emailStatusChanged: value.emailStatusChanged, emailUpcomingReminder: value.emailUpcomingReminder }; }
export function preferencePayload(value: PreferenceFormValue, verified: boolean): PreferenceFormValue { if (!verified && Object.values(value).some(Boolean)) throw new Error('完成 Email 驗證後，才能啟用 Email 通知。'); return { emailNewReservation: Boolean(value.emailNewReservation), emailStatusChanged: Boolean(value.emailStatusChanged), emailUpcomingReminder: Boolean(value.emailUpcomingReminder) }; }
export function validateOtp(value: string): string | undefined { return /^\d{6}$/.test(value) ? undefined : '請輸入六位數驗證碼'; }
export function notificationErrorMessage(error: unknown, flow: NotificationPreferenceErrorFlow = 'load') { return notificationPreferenceErrorMessage(error, flow); }
