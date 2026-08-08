import {
  hasUsableNotificationEmail,
  type NotificationPreferencesDomain,
  type NotificationPreferencesNormalizationResult
} from '../notification-preferences/notificationPreferencesDomain';

export type CustomerNotificationFormValue = {
  emailStatusChanged: boolean;
  emailUpcomingReminder: boolean;
  preservedEmailNewReservation: boolean;
};

export type CustomerNotificationAvailability = {
  state: 'ready' | 'unverified-email' | 'missing-email' | 'malformed-data';
  canRequestEmailVerification: boolean;
  canEditPreferences: boolean;
  canSave: boolean;
  message?: string;
};

export type CustomerNotificationValidationContext = {
  email: string | null;
  emailVerified: boolean;
  dataState: NotificationPreferencesNormalizationResult['kind'];
};

export type CustomerNotificationValidationResult =
  | { valid: true }
  | {
    valid: false;
    code: 'missing-email' | 'malformed-data' | 'missing-hidden-preference' | 'unverified-enabled-preference';
    message: string;
  };

export type CustomerNotificationPreferencesRequest = {
  emailNewReservation: boolean;
  emailStatusChanged: boolean;
  emailUpcomingReminder: boolean;
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isCustomerNotificationFormValue(value: unknown): value is CustomerNotificationFormValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isBoolean(candidate.emailStatusChanged)
    && isBoolean(candidate.emailUpcomingReminder)
    && isBoolean(candidate.preservedEmailNewReservation);
}

export function createCustomerNotificationForm(value: NotificationPreferencesDomain): CustomerNotificationFormValue {
  return {
    emailStatusChanged: value.emailStatusChanged,
    emailUpcomingReminder: value.emailUpcomingReminder,
    preservedEmailNewReservation: value.emailNewReservation
  };
}

export function customerNotificationAvailability(
  result: NotificationPreferencesNormalizationResult
): CustomerNotificationAvailability {
  if (result.kind === 'malformed') {
    return {
      state: 'malformed-data',
      canRequestEmailVerification: false,
      canEditPreferences: false,
      canSave: false,
      message: '通知設定資料不完整，請重新載入後再試。'
    };
  }
  if (!hasUsableNotificationEmail(result.value.email)) {
    return {
      state: 'missing-email',
      canRequestEmailVerification: false,
      canEditPreferences: false,
      canSave: false,
      message: '請先在個人資料設定 Email 後再管理通知。'
    };
  }
  if (!result.value.emailVerified) {
    return {
      state: 'unverified-email',
      canRequestEmailVerification: true,
      canEditPreferences: false,
      canSave: false,
      message: '完成 Email 驗證後，才能啟用 Email 通知。'
    };
  }
  return {
    state: 'ready',
    canRequestEmailVerification: false,
    canEditPreferences: true,
    canSave: true
  };
}

export function validateCustomerNotificationPreferences(
  value: unknown,
  context: CustomerNotificationValidationContext
): CustomerNotificationValidationResult {
  if (context.dataState === 'malformed') {
    return { valid: false, code: 'malformed-data', message: '通知設定資料不完整，請重新載入後再試。' };
  }
  if (!hasUsableNotificationEmail(context.email)) {
    return { valid: false, code: 'missing-email', message: '請先在個人資料設定 Email 後再管理通知。' };
  }
  if (!isCustomerNotificationFormValue(value)) {
    return { valid: false, code: 'missing-hidden-preference', message: '通知設定資料不完整，請重新載入後再試。' };
  }
  if (!context.emailVerified && (
    value.emailStatusChanged
    || value.emailUpcomingReminder
  )) {
    return { valid: false, code: 'unverified-enabled-preference', message: '完成 Email 驗證後，才能啟用 Email 通知。' };
  }
  return { valid: true };
}

export function isCustomerNotificationSaveSafe(
  value: unknown,
  context: CustomerNotificationValidationContext
): boolean {
  return validateCustomerNotificationPreferences(value, context).valid;
}

export function buildCustomerNotificationPreferencesRequest(
  value: unknown,
  context: CustomerNotificationValidationContext
): CustomerNotificationPreferencesRequest {
  const validation = validateCustomerNotificationPreferences(value, context);
  if (validation.valid === false) throw new Error(validation.message);
  const form = value as CustomerNotificationFormValue;
  return {
    emailNewReservation: form.preservedEmailNewReservation,
    emailStatusChanged: form.emailStatusChanged,
    emailUpcomingReminder: form.emailUpcomingReminder
  };
}
