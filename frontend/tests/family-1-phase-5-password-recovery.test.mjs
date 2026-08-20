import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadModule(path, dependencies = {}) {
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, (id) => dependencies[id] ?? (() => { throw new Error(`Unexpected dependency ${id}`); })(), module);
  return module.exports;
}

test('recovery routes use AuthShell without product Layout and preserve force-change guards', () => {
  const app = source('App.tsx');
  assert.match(app, /<AuthRouteRedirect><ForgotPasswordPage \/><\/AuthRouteRedirect>/);
  assert.match(app, /<AuthRouteRedirect><ForgotPasswordVerifyPage \/><\/AuthRouteRedirect>/);
  assert.doesNotMatch(app, /<Layout><ForgotPassword(?:Verify)?Page/);
  assert.match(app, /<RequireAuth>\s*<ForceChangeRouteGuard>\s*<ForceChangePasswordPage \/>/);
  assert.match(app, /me\?\.mustChangePassword && location\.pathname !== '\/force-change-password'/);
  assert.match(app, /if \(!me\.mustChangePassword\) return <Navigate to=\{resolvePostAuthDestination\(me\)\.path\}/);
});

test('forgot-password request uses exact enumeration-resistant contract and state handoff', () => {
  const page = source('pages/ForgotPasswordPage.tsx');
  assert.match(page, /<AuthShell[\s\S]*title="忘記密碼"/);
  assert.match(page, /電子郵件或使用者名稱/);
  assert.match(page, /if \(!normalizedIdentifier\)/);
  assert.match(page, /await api\.requestPasswordResetOtp\(forgotPasswordRequest\(normalizedIdentifier\)\)/);
  assert.match(page, /savePasswordResetState\(normalizedIdentifier\)/);
  assert.match(page, /navigate\('\/forgot-password\/verify', \{ state: resetState \}\)/);
  assert.doesNotMatch(page, /\?account=|找不到帳號|此使用者存在|recipient/);
  assert.match(page, /if \(submittingRef\.current\) return/);
  assert.match(page, /寄送中…/);
});

test('password-reset state is session-scoped, expires after ten minutes and stores no secret', () => {
  const storage = new Map();
  globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const reset = loadModule('features/auth/passwordResetState.ts');
  reset.savePasswordResetState(' customer@example.com ');
  assert.equal(reset.loadPasswordResetState().identifier, 'customer@example.com');
  const serialized = storage.get('reservio.auth.password-reset.v1');
  assert.doesNotMatch(serialized, /otp|password|token/i);
  storage.set('reservio.auth.password-reset.v1', JSON.stringify({ identifier: 'old', requestedAt: Date.now() - 10 * 60 * 1000 - 1 }));
  assert.equal(reset.loadPasswordResetState(), null);
  storage.set('reservio.auth.password-reset.v1', '{broken');
  assert.equal(reset.loadPasswordResetState(), null);
  reset.clearPasswordResetState();
  assert.equal(storage.has('reservio.auth.password-reset.v1'), false);
});

test('OTP sanitizer provides one six-digit paste-friendly semantic value', () => {
  const otp = loadModule('features/auth/OtpInput.tsx', { react: {}, 'react/jsx-runtime': {} });
  assert.equal(otp.sanitizeOtp(' 12a34-5678 '), '123456');
  assert.equal(otp.sanitizeOtp('abc'), '');
  const component = source('features/auth/OtpInput.tsx');
  assert.match(component, /inputMode="numeric"/);
  assert.match(component, /autoComplete="one-time-code"/);
  assert.match(component, /maxLength=\{6\}/);
  assert.match(component, /aria-label="驗證碼"/);
  assert.match(component, /Array\.from\(\{ length: 6 \}/);
});

test('OTP verification uses retained identifier, exact payload, authoritative refresh and no query authority', () => {
  const page = source('pages/ForgotPasswordVerifyPage.tsx');
  assert.match(page, /routeResetState\(location\.state\) \|\| loadPasswordResetState\(\)/);
  assert.match(page, /verifyPasswordOtpRequest\(identifier, normalizedOtp\)/);
  assert.match(page, /await api\.verifyPasswordResetOtp/);
  assert.match(page, /const user = await refresh\(\)/);
  assert.match(page, /if \(!user \|\| !user\.mustChangePassword\)/);
  assert.match(page, /navigate\('\/force-change-password', \{ replace: true \}\)/);
  assert.match(page, /驗證已完成，但目前無法確認帳號狀態/);
  assert.match(page, /normalizeAuthError\(requestError, 'otp-verify'\)/);
  assert.doesNotMatch(page, /params\.get\('account'\)|new URLSearchParams\(location\.search\)\.get\('account'\)/);
});

test('OTP resend reuses request endpoint, clears OTP and updates expiry without countdown', () => {
  const page = source('pages/ForgotPasswordVerifyPage.tsx');
  assert.match(page, /await api\.requestPasswordResetOtp\(forgotPasswordRequest\(identifier\)\)/);
  assert.match(page, /savePasswordResetState\(identifier\)/);
  assert.match(page, /setOtp\(''\)/);
  assert.match(page, /若帳號存在，新的驗證碼已寄至對應信箱。/);
  assert.match(page, /if \(!identifier\)[\s\S]*navigate\('\/forgot-password'/);
  assert.doesNotMatch(page, /countdown|setInterval|剩餘.*秒/);
});

test('force-change has exactly one password field and maps one exact request field', () => {
  const page = source('pages/ForceChangePasswordPage.tsx');
  assert.match(page, /<AuthShell title="設定新密碼"/);
  assert.equal((page.match(/<PasswordField/g) || []).length, 1);
  assert.doesNotMatch(page, /oldPassword|confirmPassword|確認密碼|密碼強度/);
  assert.match(page, /api\.forceChangePassword\(\{ newPassword \}\)/);
  assert.match(page, /autoComplete="new-password"/);
  assert.match(page, /if \(!newPassword\)/);
  assert.match(page, /if \(submittingRef\.current/);
  assert.match(page, /正在更新密碼…/);
});

test('force-change refreshes authoritatively and resolves role-aware only after flag clears', () => {
  const page = source('pages/ForceChangePasswordPage.tsx');
  assert.match(page, /await api\.forceChangePassword/);
  assert.match(page, /setNewPassword\(''\)/);
  assert.match(page, /const user = await refresh\(\)/);
  assert.match(page, /if \(!user \|\| user\.mustChangePassword\)/);
  assert.match(page, /resolvePostAuthDestination\(user\)\.path/);
  assert.match(page, /clearPasswordResetState\(\)/);
  assert.match(page, /密碼已更新，但目前無法確認帳號狀態/);
  assert.doesNotMatch(page, /navigate\('\/'\)/);
});

test('recovery errors expose focused safe copies for request, verify and force-change contexts', () => {
  class ApiError extends Error { constructor(status) { super('raw backend'); this.status = status; } }
  class UnauthorizedError extends Error {}
  const errors = loadModule('features/auth/authErrors.ts', {
    '../../api': { ApiError },
    '../../sessionEvents': { isUnauthorizedError: (error) => error instanceof UnauthorizedError }
  });
  assert.equal(errors.normalizeAuthError(new ApiError(429), 'otp-request').message, '嘗試過於頻繁，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new ApiError(503), 'otp-request').message, '系統暫時無法寄送驗證碼，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new ApiError(400), 'otp-verify').message, '驗證碼無效或已失效，請重新取得驗證碼。');
  assert.equal(errors.normalizeAuthError(new ApiError(503), 'otp-verify').message, '系統暫時無法驗證，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new ApiError(409), 'force-change').message, '目前無法更新密碼，請重新登入後再試。');
  assert.equal(errors.normalizeAuthError(new ApiError(503), 'force-change').message, '系統暫時無法更新密碼，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new UnauthorizedError(), 'force-change').category, 'SESSION_EXPIRED');
});

test('recovery styling is scoped, responsive, accessible and keeps force CTA with field', () => {
  const css = source('styles.css');
  assert.match(css, /\.auth-recovery \{/);
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 390px\)[^}]*\.auth-recovery/);
  assert.match(css, /\.auth-recovery--force \.auth-recovery__primary \{ margin-top: 1\.75rem/);
  assert.doesNotMatch(css, /\.auth-recovery[^\n]*position: fixed/);
  assert.doesNotMatch(css, /\.auth-recovery--force[^\n]*margin-top: auto/);
});
