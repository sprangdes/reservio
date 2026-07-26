export type CapabilityState = 'unavailable' | 'preview' | 'enabled';
export type SettingsMobileShell = 'workspace' | 'focused';

export type SettingsRouteConfig = {
  path: string;
  label: string;
  icon: string;
  desktopSecondaryNavigation: boolean;
  mobileShell: SettingsMobileShell;
  requiredRole: 'ROLE_BUSINESS';
  parentDestination: string;
  capability: CapabilityState;
  legacyAliases?: readonly string[];
};

export const settingsRouteConfig = {
  landing: { path: '/business/settings', label: '設定總覽', icon: 'bi-grid', desktopSecondaryNavigation: true, mobileShell: 'workspace', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled' },
  profile: { path: '/business/settings/profile', label: '商家資料', icon: 'bi-shop', desktopSecondaryNavigation: true, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled', legacyAliases: ['/business/info'] },
  booking: { path: '/business/settings/booking', label: '預約與時段', icon: 'bi-calendar2-week', desktopSecondaryNavigation: true, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled' },
  hours: { path: '/business/settings/hours', label: '營業時間', icon: 'bi-clock', desktopSecondaryNavigation: true, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled', legacyAliases: ['/business/info'] },
  notifications: { path: '/business/settings/notifications', label: '通知與溝通', icon: 'bi-bell', desktopSecondaryNavigation: true, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled', legacyAliases: ['/notifications/settings'] },
  line: { path: '/business/settings/integrations/line', label: '整合', icon: 'bi-puzzle', desktopSecondaryNavigation: true, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled', legacyAliases: ['/business/line-integration'] },
  account: { path: '/business/settings/account', label: '帳號與安全', icon: 'bi-shield-check', desktopSecondaryNavigation: true, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/business/settings', capability: 'enabled' },
  serviceManage: { path: '/service/manage', label: '服務管理', icon: 'bi-scissors', desktopSecondaryNavigation: false, mobileShell: 'workspace', requiredRole: 'ROLE_BUSINESS', parentDestination: '/service/manage', capability: 'enabled' },
  serviceNew: { path: '/service/new', label: '新增服務', icon: 'bi-plus-circle', desktopSecondaryNavigation: false, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/service/manage', capability: 'enabled' },
  serviceEdit: { path: '/service/:id/edit', label: '編輯服務', icon: 'bi-pencil-square', desktopSecondaryNavigation: false, mobileShell: 'focused', requiredRole: 'ROLE_BUSINESS', parentDestination: '/service/manage', capability: 'enabled' }
} as const satisfies Record<string, SettingsRouteConfig>;

export const settingsCapabilities: Readonly<Record<
  'publicBusinessProfile' | 'branding' | 'bookingRules' | 'multipleBusinessHourIntervals' | 'temporaryClosureRanges' | 'servicePrice' | 'serviceCategories' | 'serviceOrdering' | 'staff' | 'resources' | 'messageTemplates' | 'lineLiveHealth' | 'merchantProfileEditing' | 'voluntaryPasswordChange' | 'sessionManagement' | 'deviceManagement' | 'accountDeletion' | 'auditHistory',
  CapabilityState
>> = {
  publicBusinessProfile: previewState(), branding: previewState(), bookingRules: previewState(), multipleBusinessHourIntervals: 'unavailable', temporaryClosureRanges: 'unavailable', servicePrice: previewState(), serviceCategories: previewState(), serviceOrdering: previewState(), staff: previewState(), resources: previewState(), messageTemplates: previewState(), lineLiveHealth: 'unavailable', merchantProfileEditing: 'unavailable', voluntaryPasswordChange: 'unavailable', sessionManagement: 'unavailable', deviceManagement: 'unavailable', accountDeletion: 'unavailable', auditHistory: 'unavailable'
};

function previewState(): CapabilityState {
  return import.meta.env.DEV && import.meta.env.VITE_BUSINESS_SETTINGS_PREVIEW === 'true' ? 'preview' : 'unavailable';
}
