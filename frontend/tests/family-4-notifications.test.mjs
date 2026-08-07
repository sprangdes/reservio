import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-settings/notifications/', import.meta.url);
const sharedRoot = new URL('../src/features/notification-preferences/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
const sharedSource = (path) => readFileSync(new URL(path, sharedRoot), 'utf8');

function transpile(value, require) {
  const code = ts.transpileModule(value, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const sharedDomain = transpile(sharedSource('notificationPreferencesDomain.ts'), () => ({}));
const domain = transpile(source('notificationPreferences.ts'), (request) => (
  request.includes('notification-preferences') ? sharedDomain : {}
));

test('notification preferences normalize only complete account-level values', () => {
  const raw = {
    email: 'merchant@example.com',
    emailVerified: false,
    emailNewReservation: true,
    emailStatusChanged: false,
    emailUpcomingReminder: true
  };
  const normalized = domain.normalizeNotificationPreferences(raw);
  assert.deepEqual(normalized, raw);
  assert.notEqual(normalized, raw);
  assert.equal(domain.normalizeNotificationPreferences({ ...raw, emailVerified: 'false' }), undefined);
  assert.equal(domain.normalizeNotificationPreferences({ ...raw, email: 'bad' }), undefined);
  assert.equal(domain.normalizeNotificationPreferences({ ...raw, email: '' }), undefined);
});

test('preference payload includes only all supported booleans and gates unverified enabled values', () => {
  const value = { emailNewReservation: true, emailStatusChanged: false, emailUpcomingReminder: true };
  assert.deepEqual(domain.preferencePayload(value, true), value);
  assert.throws(() => domain.preferencePayload(value, false));
  assert.deepEqual(
    domain.preferencePayload({ emailNewReservation: false, emailStatusChanged: false, emailUpcomingReminder: false }, false),
    { emailNewReservation: false, emailStatusChanged: false, emailUpcomingReminder: false }
  );
});

test('OTP requires exactly six numeric digits and preserves leading zeroes', () => {
  assert.equal(domain.validateOtp('012345'), undefined);
  assert.equal(domain.validateOtp('12345'), '請輸入六位數驗證碼');
  assert.equal(domain.validateOtp('12345a'), '請輸入六位數驗證碼');
});

test('merchant editor keeps verification separate from dirty preferences and uses supported APIs', () => {
  const editor = source('NotificationSettingsEditor.tsx');
  const dialog = source('EmailVerificationDialog.tsx');
  assert.match(editor, /key: 'merchant-notification-preferences'/);
  assert.match(editor, /api\.notificationPreferences/);
  assert.match(editor, /api\.updateNotificationPreferences/);
  assert.match(editor, /refreshSettingsOverviewSection\('notifications'\)/);
  assert.match(editor, /completed Email 驗證後|完成 Email 驗證後/);
  assert.match(dialog, /api\.requestEmailVerification/);
  assert.match(dialog, /api\.verifyEmail/);
  assert.match(dialog, /useModalFocusTrap/);
  assert.match(dialog, /maxLength=\{6\}/);
  assert.doesNotMatch(dialog, /localStorage|sessionStorage|window\.confirm/);
});
