import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const page = source('features/customer-notifications/CustomerNotificationSettingsPage.tsx');
const flow = source('features/customer-notifications/CustomerEmailVerificationFlow.tsx');
const form = source('features/customer-notifications/useCustomerNotificationForm.ts');
const styles = source('styles.css');
const merchantDialog = source('features/business-settings/notifications/EmailVerificationDialog.tsx');
const domain = source('features/notification-preferences/notificationPreferencesDomain.ts');

test('unverified customers can begin verification only through a usable normalized Email', () => {
  assert.match(page, /availability\.canRequestEmailVerification \? \(\) => setVerificationOpen\(true\) : undefined/);
  assert.match(page, /verificationOpen && domain\.email/);
  assert.match(page, /onStartVerification/);
  assert.match(page, /to=\{CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET\}>變更 Email/);
});

test('the customer verification portal makes the full application background inert and restores prior state', () => {
  assert.match(flow, /document\.getElementById\('root'\)/);
  assert.match(flow, /applicationRoot\?\.setAttribute\('inert', ''\)/);
  assert.match(flow, /applicationRoot\?\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(flow, /if \(!hadInert\) applicationRoot\.removeAttribute\('inert'\)/);
  assert.match(flow, /previousAriaHidden === null/);
});

test('request confirmation keeps the current Email read-only and reuses the request adapter', () => {
  assert.match(flow, /api\.requestEmailVerification\(\{ email \}\)/);
  assert.match(flow, /我們會將驗證碼寄到目前的帳號 Email。/);
  assert.match(flow, /驗證 Email/);
  assert.match(flow, /請確認這是你目前可以收信的 Email。/);
  assert.match(flow, /寄送驗證碼/);
  assert.match(flow, /if \(pending\) return/);
  assert.doesNotMatch(flow, /type="email"/);
});

test('OTP is a transient six-digit numeric field with leading-zero and paste support', () => {
  assert.match(flow, /validateOtp\(otp\)/);
  assert.match(flow, /replace\(\/\\D\/g, ''\)\.slice\(0, 6\)/);
  assert.match(flow, /inputMode="numeric"/);
  assert.match(flow, /autoComplete="one-time-code"/);
  assert.match(flow, /maxLength=\{6\}/);
  assert.match(flow, /請輸入 6 位數驗證碼/);
  assert.match(flow, /notificationPreferenceErrorMessage\(reason, 'verify'\)/);
  assert.match(domain, /驗證碼無效或已失效，請確認後再試。/);
  assert.match(flow, /setOtp\(''\)/);
  assert.doesNotMatch(flow, /localStorage|sessionStorage|console\.|analytics|location\.search|route state/);
});

test('verification is non-authoritative until preference GET normalizes a verified result and Auth refresh completes', () => {
  assert.match(flow, /api\.verifyEmail\(\{ otp \}\)/);
  assert.match(flow, /await onVerified\(\)/);
  assert.match(page, /const \{ refresh: refreshAuth \} = useAuth\(\)/);
  assert.match(page, /await api\.notificationPreferences\(\)/);
  assert.match(page, /normalized\.kind !== 'valid' \|\| !normalized\.value\.emailVerified/);
  assert.match(page, /form\.reconcileAuthoritative\(createCustomerNotificationForm\(normalized\.value\)\)/);
  assert.match(page, /await refreshAuth\(\)/);
  assert.match(page, /Email 驗證成功。/);
});

test('refresh failure stays recoverable without consuming another OTP and retains stale local values', () => {
  assert.match(flow, /step === 'refresh'/);
  assert.match(flow, /重新載入/);
  assert.match(flow, /驗證已完成，但通知設定尚未同步，請重新載入後再試。/);
  assert.match(page, /form\.markStale\(\)/);
  assert.match(page, /setStaleError\('目前顯示的是先前載入的設定，部分狀態可能尚未同步。'\)/);
  assert.match(form, /baseline: keepVisibleEdits \? current\.baseline : visibleFields\(value\)/);
  assert.match(form, /preservedEmailNewReservation: value\.preservedEmailNewReservation/);
});

test('resend uses the same request endpoint and has no invented timer or attempt behavior', () => {
  assert.match(flow, /requestCode\(true\)/);
  assert.match(flow, /重新寄送驗證碼/);
  assert.doesNotMatch(flow, /cooldown|countdown|remaining attempts|嘗試次數|倒數|setInterval/);
});

test('customer dialog is accessible and uses desktop dialog plus mobile bottom-sheet geometry', () => {
  for (const fragment of [
    'role="dialog"',
    'aria-modal="true"',
    'useModalFocusTrap',
    'aria-label="關閉驗證 Email"',
    'aria-describedby={`customer-email-verification-otp-helper${error',
    'role="alert"',
    "event.key === 'Escape' && !pending",
    "applicationRoot?.setAttribute('inert', '')"
  ]) assert.match(flow, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(styles, /\.customer-email-verification__surface/);
  assert.match(styles, /@media \(max-width: 48rem\)[\s\S]*\.customer-email-verification__surface/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});

test('Family 4 verification stays isolated from the customer presentation', () => {
  assert.match(merchantDialog, /api\.requestEmailVerification/);
  assert.match(merchantDialog, /api\.verifyEmail/);
  assert.match(merchantDialog, /useModalFocusTrap/);
  assert.doesNotMatch(merchantDialog, /CustomerEmailVerificationFlow|customer-email-verification/);
});
