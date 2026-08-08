import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const page = source('features/customer-notifications/CustomerNotificationSettingsPage.tsx');
const form = source('features/customer-notifications/useCustomerNotificationForm.ts');
const styles = source('styles.css');

test('Family 5 customer page loads and saves only through the Phase 2 domain boundary', () => {
  assert.match(page, /api\.notificationPreferences\(\)/);
  assert.match(page, /normalizeNotificationPreferencesDomain\(response\?\.data\)/);
  assert.match(page, /createCustomerNotificationForm\(normalized\.value\)/);
  assert.match(page, /buildCustomerNotificationPreferencesRequest\(form\.values, context\)/);
  assert.match(page, /api\.updateNotificationPreferences\(payload\)/);
  assert.match(page, /validateCustomerNotificationPreferences\(form\.values, context\)/);
  assert.match(page, /notificationPreferenceErrorMessage\(reason, 'load'\)/);
  assert.match(page, /notificationPreferenceErrorMessage\(reason, 'save'\)/);
  assert.match(page, /CustomerEmailVerificationFlow/);
  assert.match(page, /onStartVerification/);
});

test('customer page renders exactly the two approved preferences and never exposes the hidden backend field', () => {
  assert.match(page, /label: '預約狀態異動'/);
  assert.match(page, /label: '即將到來的預約提醒'/);
  assert.match(page, /emailStatusChanged/);
  assert.match(page, /emailUpcomingReminder/);
  assert.doesNotMatch(page, /label: '新預約通知'/);
  assert.doesNotMatch(page, /emailNewReservation/);
  assert.match(page, /preservedEmailNewReservation/);
});

test('verified, unverified, missing-email, malformed, loading, stale, and save-failure states remain explicit', () => {
  assert.match(page, /已驗證/);
  assert.match(page, /尚未驗證/);
  assert.match(page, /完成 Email 驗證後，才能啟用 Email 通知。/);
  assert.match(page, /需先驗證 Email 才能啟用通知。/);
  assert.match(page, /尚未設定 Email/);
  assert.match(page, /需要先設定 Email，才能使用 Email 通知。/);
  assert.match(page, /NotificationSettingsSkeleton/);
  assert.match(page, /NotificationSettingsError/);
  assert.match(page, /NotificationSettingsStaleWarning/);
  assert.match(page, /目前顯示的是先前載入的設定，部分狀態可能尚未同步。/);
  assert.match(page, /form\.failSave\(message\)/);
});

test('customer form dirtiness compares visible settings only and preserves hidden data through discard and authoritative refresh', () => {
  assert.match(form, /useRegisterDirtyForm\('customer-notification-preferences'/);
  assert.match(form, /emailStatusChanged: current\.baseline\.emailStatusChanged/);
  assert.match(form, /emailUpcomingReminder: current\.baseline\.emailUpcomingReminder/);
  assert.match(form, /preservedEmailNewReservation: current\.values\.preservedEmailNewReservation/);
  assert.match(form, /preservedEmailNewReservation: value\.preservedEmailNewReservation/);
  assert.match(form, /sameVisibleFields\(snapshot\.baseline, visibleFields\(snapshot\.values\)\)/);
});

test('customer page uses accessible controls and an account-local responsive save bar', () => {
  for (const fragment of [
    'role="switch"',
    'aria-describedby={disabledReason ? reasonId : undefined}',
    'role="alert"',
    'aria-live="polite"',
    'customer-notification-settings__save-bar',
    '捨棄變更',
    '儲存設定'
  ]) assert.match(page, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(styles, /\.customer-notification-settings__save-bar/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /\.customer-notification-settings__switch:focus-visible/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(page, /MobileBottomNavigation|business-settings__save-bar|business-workspace/);
});
