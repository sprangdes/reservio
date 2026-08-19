import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const app = source('App.tsx');
const navbar = source('components/Navbar.tsx');
const page = source('features/customer-notifications/CustomerNotificationSettingsPage.tsx');
const merchantNotifications = source('features/business-operations/MerchantNotificationsPage.tsx');
const workspaceShell = source('features/business-operations/BusinessWorkspaceShell.tsx');
const workspaceTopBar = source('features/business-operations/ui/WorkspaceTopBar.tsx');
const mobileWorkspaceHeader = source('features/business-operations/ui/MobileWorkspaceHeader.tsx');
const flow = source('features/customer-notifications/CustomerEmailVerificationFlow.tsx');
const customerDomain = source('features/customer-notifications/customerNotificationPreferences.ts');
const customerForm = source('features/customer-notifications/useCustomerNotificationForm.ts');
const sharedDomain = source('features/notification-preferences/notificationPreferencesDomain.ts');
const styles = source('styles.css');

test('Family 5 retains one role-aware customer route, one merchant canonical route, and unaffected notification and LINE routes', () => {
  assert.match(app, /path="\/notifications\/settings"/);
  assert.match(app, /<RequireAuth><NotificationSettingsCompatibility \/><\/RequireAuth>/);
  assert.match(app, /path="\/business\/settings\/notifications"/);
  assert.match(app, /<RequireAuth><SettingsRoute page="notifications" \/><\/RequireAuth>/);
  assert.match(app, /merchant-compatibility/);
  assert.match(app, /return <NotificationSettingsPage \/>;/);
  assert.match(app, /path="\/notifications"/);
  assert.match(app, /RoleAwareNotificationsRoute/);
  assert.match(app, /<BusinessWorkspaceShell><MerchantNotificationsPage \/><\/BusinessWorkspaceShell>/);
  assert.match(app, /return <NotificationsPage \/>;/);
  assert.match(merchantNotifications, /api\.notifications/);
  assert.match(merchantNotifications, /markAllNotificationsRead/);
  assert.match(merchantNotifications, /reservationId=\$\{item\.reservationId\}/);
  for (const route of ['/line/account-link', '/settings/line-accounts', '/business/settings/integrations/line']) {
    assert.match(app, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('Navbar uses the canonical destination and has no obsolete customer notification-settings modal trigger', () => {
  assert.match(navbar, /notificationSettingsDestinationFor\(me\?\.role\)/);
  assert.match(navbar, /to=\{notificationSettingsDestination\}/);
  assert.doesNotMatch(navbar, /NotificationSettingsPanel|setNotificationSettingsOpen|notificationSettingsOpen/);
});

test('merchant notification indicator reflects the shared unread count after notification changes', () => {
  assert.match(workspaceShell, /api\.notificationUnreadCount\(\)/);
  assert.match(workspaceShell, /NOTIFICATIONS_CHANGED_EVENT/);
  assert.match(workspaceShell, /unreadCount=\{unreadCount\}/);
  for (const header of [workspaceTopBar, mobileWorkspaceHeader]) {
    assert.match(header, /unreadCount > 0 \? <span className="business-workspace__notification-dot" aria-hidden="true" \/> : null/);
  }
});

test('customer save and verification preserve account-level data without exposing or prematurely mutating it', () => {
  assert.match(page, /api\.updateNotificationPreferences\(payload\)/);
  assert.match(page, /normalizeNotificationPreferencesDomain\(response\?\.data\)/);
  assert.match(page, /api\.notificationPreferences\(\)/);
  assert.match(page, /await refreshAuth\(\)/);
  assert.match(customerDomain, /emailNewReservation: form\.preservedEmailNewReservation/);
  assert.doesNotMatch(page, /emailNewReservation/);
  assert.match(customerForm, /preservedEmailNewReservation: value\.preservedEmailNewReservation/);
  assert.match(flow, /await api\.requestEmailVerification\(\{ email \}\)/);
  assert.match(flow, /await api\.verifyEmail\(\{ otp \}\)/);
  assert.match(flow, /setOtp\(''\)/);
  assert.doesNotMatch(flow, /localStorage|sessionStorage|console\.(log|debug|warn|error)|location\.search|history\.pushState/);
});

test('approved desktop and mobile accessibility geometry remains explicit', () => {
  for (const fragment of [
    'role="switch"',
    'aria-describedby={disabledReason ? reasonId : undefined}',
    'autoComplete="one-time-code"',
    'inputMode="numeric"',
    'role="dialog"',
    'aria-modal="true"',
    'customer-email-verification__surface',
    'customer-notification-settings__save-bar'
  ]) assert.match(`${page}\n${flow}`, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(styles, /@media \(max-width: 48rem\)[\s\S]*customer-email-verification__surface/);
  assert.match(styles, /max-height: min\(92dvh, 48rem\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /overflow-wrap: anywhere/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('shared error mapping remains safe and role-neutral', () => {
  assert.match(sharedDomain, /'authentication'/);
  assert.match(sharedDomain, /'authorization'/);
  assert.match(sharedDomain, /'unverified-email'/);
  assert.match(sharedDomain, /'network'/);
  assert.match(sharedDomain, /'server'/);
  assert.match(sharedDomain, /'unknown'/);
  assert.doesNotMatch(sharedDomain, /error\.stack|JSON\.stringify\(error\)/);
});
