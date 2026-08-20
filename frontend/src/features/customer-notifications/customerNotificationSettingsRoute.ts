export const CUSTOMER_NOTIFICATION_SETTINGS_ROUTE = '/notifications/settings';
export const MERCHANT_NOTIFICATION_SETTINGS_ROUTE = '/business/settings/notifications';
export const CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET = '/profile';

export const customerNotificationSettingsRoute = {
  path: CUSTOMER_NOTIFICATION_SETTINGS_ROUTE,
  roleScope: 'ROLE_USER',
  shell: 'customer',
  mobileShell: 'focused',
  title: '通知設定',
  backTarget: CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET,
  canonicalRoute: CUSTOMER_NOTIFICATION_SETTINGS_ROUTE
} as const;

export const merchantNotificationSettingsRoute = {
  path: MERCHANT_NOTIFICATION_SETTINGS_ROUTE,
  roleScope: 'ROLE_BUSINESS',
  shell: 'merchant-settings',
  canonicalRoute: MERCHANT_NOTIFICATION_SETTINGS_ROUTE,
  compatibilityRoute: CUSTOMER_NOTIFICATION_SETTINGS_ROUTE
} as const;

export type NotificationSettingsRouteResolution = 'customer' | 'merchant-compatibility';

export function resolveNotificationSettingsRoute(role: string | undefined, hasBusiness: boolean): NotificationSettingsRouteResolution {
  return role === 'ROLE_BUSINESS' && hasBusiness ? 'merchant-compatibility' : 'customer';
}

export function notificationSettingsDestinationFor(role: string | undefined): string {
  return role === 'ROLE_BUSINESS' ? MERCHANT_NOTIFICATION_SETTINGS_ROUTE : CUSTOMER_NOTIFICATION_SETTINGS_ROUTE;
}
