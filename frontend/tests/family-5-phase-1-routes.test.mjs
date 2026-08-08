import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const app = source('App.tsx');
const navbar = source('components/Navbar.tsx');
const route = source('features/customer-notifications/customerNotificationSettingsRoute.ts');
const page = source('features/customer-notifications/CustomerNotificationSettingsPage.tsx');
const styles = source('styles.css');

test('Family 5 resolves the canonical customer notification route by authenticated role', () => {
  assert.match(app, /function RoleAwareNotificationSettingsRoute/);
  assert.match(app, /resolveNotificationSettingsRoute\(me\?\.role, Boolean\(me\?\.business\)\)/);
  assert.match(app, /<Layout><NotificationSettingsPage \/><\/Layout>/);
  assert.match(app, /<BusinessWorkspaceShell focused><SettingsScaffoldPage page="notifications" \/><\/BusinessWorkspaceShell>/);
  assert.match(app, /path="\/notifications\/settings"/);
  assert.match(app, /<RequireAuth><NotificationSettingsCompatibility \/><\/RequireAuth>/);
  assert.match(app, /path="\/business\/settings\/notifications"/);
  assert.match(app, /<RequireAuth><SettingsRoute page="notifications" \/><\/RequireAuth>/);
  assert.match(app, /PasswordResetGuard/);
  assert.match(app, /BusinessSetupGuard/);
  assert.match(app, /function RequireBusiness/);
  assert.match(app, /login\?returnTo=\$\{returnTo\}/);
});

test('Family 5 route metadata keeps customer and merchant canonical destinations distinct', () => {
  assert.match(route, /CUSTOMER_NOTIFICATION_SETTINGS_ROUTE = '\/notifications\/settings'/);
  assert.match(route, /MERCHANT_NOTIFICATION_SETTINGS_ROUTE = '\/business\/settings\/notifications'/);
  assert.match(route, /CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET = '\/profile'/);
  assert.match(route, /roleScope: 'ROLE_USER'/);
  assert.match(route, /shell: 'customer'/);
  assert.match(route, /mobileShell: 'focused'/);
  assert.match(route, /role === 'ROLE_BUSINESS' && hasBusiness/);
  assert.match(route, /role === 'ROLE_BUSINESS' \? MERCHANT_NOTIFICATION_SETTINGS_ROUTE : CUSTOMER_NOTIFICATION_SETTINGS_ROUTE/);
});

test('customer route keeps the Family 5 shell, one heading, and profile back target', () => {
  assert.match(page, /<main className="customer-notification-settings"/);
  assert.match(page, /<h1 id="customer-notification-settings-title">/);
  assert.match(page, /通知設定/);
  assert.match(page, /管理目前帳號接收預約相關 Email 通知的方式。/);
  assert.match(page, /這些設定套用至目前帳號，不會依商家而變。/);
  assert.match(page, /to=\{CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET\}/);
  assert.match(page, /aria-label="返回個人資料"/);
  assert.match(page, /<SettingsInfrastructure>/);
});

test('navbar canonicalizes notification actions and retires the legacy customer notification modal', () => {
  assert.match(navbar, /notificationSettingsDestinationFor\(me\?\.role\)/);
  assert.match(navbar, /to=\{notificationSettingsDestination\}/);
  assert.match(navbar, /CUSTOMER_NOTIFICATION_SETTINGS_ROUTE/);
  assert.match(navbar, /customer-settings-navbar__mobile-topbar/);
  assert.doesNotMatch(navbar, /NotificationSettingsPanel/);
  assert.doesNotMatch(navbar, /openSettingsPanel\('notifications'\)/);
  assert.match(navbar, /PreferredBusinessesPanel/);
});

test('customer desktop and mobile shell styles remain focused, accessible, and free of merchant navigation', () => {
  for (const selector of ['.customer-notification-settings', '.customer-notification-settings__content', '.customer-notification-settings__back', '.customer-settings-navbar__mobile-topbar']) {
    assert.match(styles, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(styles, /width: min\(100%, 45rem\)/);
  assert.match(styles, /@media \(max-width: 768px\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /outline: 3px solid rgba\(0, 81, 58, \.48\)/);
  assert.doesNotMatch(page, /business-workspace|business-settings__secondary-nav|MobileBottomNavigation/);
});
