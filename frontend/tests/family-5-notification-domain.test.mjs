import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

function transpile(value, require) {
  const code = ts.transpileModule(value, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const shared = transpile(source('features/notification-preferences/notificationPreferencesDomain.ts'), () => ({}));
const customer = transpile(
  source('features/customer-notifications/customerNotificationPreferences.ts'),
  (request) => (request.includes('notification-preferences') ? shared : {})
);

const verifiedRaw = {
  email: 'machi@example.com',
  emailVerified: true,
  emailNewReservation: true,
  emailStatusChanged: true,
  emailUpcomingReminder: false
};

const unverifiedRaw = {
  email: 'machi@example.com',
  emailVerified: false,
  emailNewReservation: false,
  emailStatusChanged: false,
  emailUpcomingReminder: false
};

test('shared notification normalization is strict, immutable, and distinguishes missing Email from malformed data', () => {
  const raw = Object.freeze({ ...verifiedRaw });
  const verified = shared.normalizeNotificationPreferencesDomain(raw);
  assert.deepEqual(verified, { kind: 'valid', value: verifiedRaw });
  assert.notEqual(verified.value, raw);
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...unverifiedRaw }), { kind: 'valid', value: unverifiedRaw });
  assert.deepEqual(
    shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailNewReservation: false, emailStatusChanged: false, emailUpcomingReminder: false }),
    { kind: 'valid', value: { ...verifiedRaw, emailNewReservation: false, emailStatusChanged: false, emailUpcomingReminder: false } }
  );
  assert.equal(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, email: '' }).kind, 'missing-email');
  assert.equal(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, email: '   ' }).kind, 'missing-email');
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, email: 'invalid-email' }), { kind: 'malformed', reason: 'invalid-email' });
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailVerified: 'true' }), { kind: 'malformed', reason: 'invalid-email-verified' });
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailNewReservation: 1 }), { kind: 'malformed', reason: 'invalid-email-new-reservation' });
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailStatusChanged: null }), { kind: 'malformed', reason: 'invalid-email-status-changed' });
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailUpcomingReminder: undefined }), { kind: 'malformed', reason: 'invalid-email-upcoming-reminder' });
  assert.deepEqual(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailNewReservation: undefined }), { kind: 'malformed', reason: 'invalid-email-new-reservation' });
  assert.deepEqual(raw, verifiedRaw);
});

test('customer form exposes only supported customer fields and preserves the hidden authoritative preference', () => {
  const domain = Object.freeze({ ...verifiedRaw });
  const form = customer.createCustomerNotificationForm(domain);
  assert.deepEqual(form, {
    emailStatusChanged: true,
    emailUpcomingReminder: false,
    preservedEmailNewReservation: true
  });
  assert.notEqual(form, domain);
  assert.equal('email' in form, false);
  assert.equal('emailVerified' in form, false);
  assert.equal('emailNewReservation' in form, false);
  assert.deepEqual(domain, verifiedRaw);
});

test('customer validation permits only safe complete payloads for the current Email state', () => {
  const verifiedContext = { email: 'machi@example.com', emailVerified: true, dataState: 'valid' };
  const unverifiedContext = { email: 'machi@example.com', emailVerified: false, dataState: 'valid' };
  const enabled = { emailStatusChanged: true, emailUpcomingReminder: false, preservedEmailNewReservation: false };
  const disabled = { emailStatusChanged: false, emailUpcomingReminder: false, preservedEmailNewReservation: false };
  assert.deepEqual(customer.validateCustomerNotificationPreferences(enabled, verifiedContext), { valid: true });
  assert.deepEqual(customer.validateCustomerNotificationPreferences(disabled, verifiedContext), { valid: true });
  assert.equal(customer.validateCustomerNotificationPreferences(enabled, unverifiedContext).code, 'unverified-enabled-preference');
  assert.deepEqual(customer.validateCustomerNotificationPreferences(disabled, unverifiedContext), { valid: true });
  assert.equal(
    customer.validateCustomerNotificationPreferences({ ...disabled, preservedEmailNewReservation: true }, unverifiedContext).code,
    'unverified-enabled-preference'
  );
  assert.equal(customer.validateCustomerNotificationPreferences(disabled, { ...verifiedContext, email: null, dataState: 'missing-email' }).code, 'missing-email');
  assert.equal(customer.validateCustomerNotificationPreferences(disabled, { ...verifiedContext, dataState: 'malformed' }).code, 'malformed-data');
  assert.equal(customer.validateCustomerNotificationPreferences({ emailStatusChanged: false, emailUpcomingReminder: false }, verifiedContext).code, 'missing-hidden-preference');
  assert.equal(customer.isCustomerNotificationSaveSafe(disabled, verifiedContext), true);
  assert.equal(customer.isCustomerNotificationSaveSafe(enabled, unverifiedContext), false);
});

test('customer PUT mapper sends exactly all three backend booleans without mutating or inferring the hidden value', () => {
  const context = { email: 'machi@example.com', emailVerified: true, dataState: 'valid' };
  const formWithHiddenTrue = Object.freeze({
    emailStatusChanged: false,
    emailUpcomingReminder: true,
    preservedEmailNewReservation: true,
    email: 'should-not-be-sent',
    emailVerified: false,
    role: 'ROLE_USER',
    dirty: true
  });
  const requestWithHiddenTrue = customer.buildCustomerNotificationPreferencesRequest(formWithHiddenTrue, context);
  assert.deepEqual(requestWithHiddenTrue, {
    emailNewReservation: true,
    emailStatusChanged: false,
    emailUpcomingReminder: true
  });
  assert.deepEqual(Object.keys(requestWithHiddenTrue).sort(), ['emailNewReservation', 'emailStatusChanged', 'emailUpcomingReminder']);
  assert.notEqual(requestWithHiddenTrue, formWithHiddenTrue);
  assert.deepEqual(formWithHiddenTrue, {
    emailStatusChanged: false,
    emailUpcomingReminder: true,
    preservedEmailNewReservation: true,
    email: 'should-not-be-sent',
    emailVerified: false,
    role: 'ROLE_USER',
    dirty: true
  });

  const formWithHiddenFalse = {
    emailStatusChanged: true,
    emailUpcomingReminder: false,
    preservedEmailNewReservation: false
  };
  assert.deepEqual(customer.buildCustomerNotificationPreferencesRequest(formWithHiddenFalse, context), {
    emailNewReservation: false,
    emailStatusChanged: true,
    emailUpcomingReminder: false
  });
  assert.throws(
    () => customer.buildCustomerNotificationPreferencesRequest({ emailStatusChanged: false, emailUpcomingReminder: false }, context),
    /通知設定資料不完整/
  );
  assert.throws(
    () => customer.buildCustomerNotificationPreferencesRequest({ ...formWithHiddenFalse, emailStatusChanged: true }, { ...context, emailVerified: false }),
    /完成 Email 驗證後/
  );
});

test('availability and error helpers distinguish usable, missing, malformed, and failure states', () => {
  assert.deepEqual(customer.customerNotificationAvailability(shared.normalizeNotificationPreferencesDomain(verifiedRaw)), {
    state: 'ready',
    canRequestEmailVerification: false,
    canEditPreferences: true,
    canSave: true
  });
  assert.deepEqual(customer.customerNotificationAvailability(shared.normalizeNotificationPreferencesDomain(unverifiedRaw)), {
    state: 'unverified-email',
    canRequestEmailVerification: true,
    canEditPreferences: false,
    canSave: false,
    message: '完成 Email 驗證後，才能啟用 Email 通知。'
  });
  assert.equal(customer.customerNotificationAvailability(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, email: '' })).state, 'missing-email');
  assert.equal(customer.customerNotificationAvailability(shared.normalizeNotificationPreferencesDomain({ ...verifiedRaw, emailVerified: null })).state, 'malformed-data');
  assert.equal(shared.notificationPreferenceErrorCategory(new Error('Unauthorized')), 'authentication');
  assert.equal(shared.notificationPreferenceErrorCategory(new Error('Forbidden')), 'authorization');
  assert.equal(shared.notificationPreferenceErrorCategory(new Error('請先驗證 Email')), 'unverified-email');
  assert.equal(shared.notificationPreferenceErrorCategory(new Error('failed to fetch')), 'network');
  assert.equal(shared.notificationPreferenceErrorMessage(new Error('failed to fetch'), 'save'), '網路連線失敗，請確認連線後重試。');
  assert.equal(shared.notificationPreferenceErrorMessage(new Error('unrecognized'), 'save'), '儲存通知設定失敗，請稍後再試。');
});

test('Family 4 merchant domain remains separate from customer hidden-field rules', () => {
  const merchantEditor = source('features/business-settings/notifications/NotificationSettingsEditor.tsx');
  const merchantDomain = source('features/business-settings/notifications/notificationPreferences.ts');
  assert.match(merchantEditor, /emailNewReservation/);
  assert.match(merchantDomain, /preferencePayload/);
  assert.doesNotMatch(merchantEditor, /preservedEmailNewReservation|createCustomerNotificationForm|buildCustomerNotificationPreferencesRequest/);
});
