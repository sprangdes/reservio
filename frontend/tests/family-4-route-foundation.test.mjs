import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const app = source('App.tsx');
const config = source('features/business-settings/settingsRouteConfig.ts');
const pages = source('features/business-settings/SettingsPages.tsx');
const secondaryNavigation = source('features/business-settings/SettingsSecondaryNavigation.tsx');
const shell = source('features/business-operations/BusinessWorkspaceShell.tsx');
const mobileNavigation = source('features/business-operations/ui/MobileBottomNavigation.tsx');

test('Family 4 establishes every canonical settings and service scaffold route', () => {
  for (const path of ['/business/settings', '/business/settings/profile', '/business/settings/booking', '/business/settings/hours', '/business/settings/notifications', '/business/settings/integrations/line', '/business/settings/account', '/service/manage', '/service/new', '/service/:id/edit']) assert.match(app, new RegExp(path.replace(/[/:]/g, '\\$&')));
  assert.match(app, /function RequireBusiness/);
  assert.match(app, /role !== 'ROLE_BUSINESS'/);
  assert.match(app, /BusinessSetupGuard/);
  assert.match(app, /PasswordResetGuard/);
});

test('settings secondary navigation uses the approved labels, links, and active page semantics', () => {
  for (const label of ['設定總覽', '商家資料', '預約與時段', '營業時間', '通知與溝通', '整合', '帳號與安全']) assert.match(config, new RegExp(label));
  assert.match(secondaryNavigation, /<nav/);
  assert.match(secondaryNavigation, /aria-current/);
  assert.match(secondaryNavigation, /pathname === item\.path/);
});

test('mobile distinguishes workspace pages from focused editor pages without a competing bottom navigation', () => {
  assert.match(config, /mobileShell: 'workspace'/);
  assert.match(config, /mobileShell: 'focused'/);
  assert.match(shell, /focused = false/);
  assert.match(shell, /!focused \? <MobileBottomNavigation/);
  assert.match(pages, /FocusedSettingsHeader/);
  assert.match(mobileNavigation, /to: '\/business\/settings'/);
});

test('legacy routes remain available and preserve role-specific notification presentation', () => {
  assert.match(app, /path="\/business\/info"/);
  assert.match(app, /<BusinessInfoPage \/>/);
  assert.match(app, /function NotificationSettingsCompatibility/);
  assert.match(app, /return <NotificationSettingsPage \/>;/);
  assert.match(app, /function LineIntegrationCompatibility/);
  assert.match(app, /path="\/business\/line-integration"/);
});

test('Family 4 capability defaults are production-safe and cannot transport or persist preview data', () => {
  assert.match(config, /VITE_BUSINESS_SETTINGS_PREVIEW === 'true'/);
  assert.match(config, /multipleBusinessHourIntervals: 'unavailable'/);
  assert.match(config, /lineLiveHealth: 'unavailable'/);
  assert.match(config, /accountDeletion: 'unavailable'/);
  assert.doesNotMatch(config, /fetch\(|\/api\/|localStorage|sessionStorage/);
});
