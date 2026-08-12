import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadModule(path, dependencies = {}) {
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, (id) => dependencies[id] ?? (() => { throw new Error(`Unexpected dependency ${id}`); })(), module);
  return module.exports;
}

const domain = loadModule('features/auth/registrationDomain.ts');

test('registration routes use AuthShell directly and retain the Phase 1 authenticated route guard', () => {
  const app = source('App.tsx');
  assert.match(app, /path="\/register"[\s\S]*?<AuthRouteRedirect><RegisterPage \/><\/AuthRouteRedirect>/);
  assert.match(app, /path="\/register-business"[\s\S]*?<AuthRouteRedirect><RegisterBusinessPage \/><\/AuthRouteRedirect>/);
  assert.doesNotMatch(app, /<AuthRouteRedirect><Layout><Register(?:Business)?Page/);
  assert.match(app, /resolvePostAuthDestination\(me\)\.path/);
});

test('customer validation and request mapping remain exact and do not trim passwords', () => {
  const form = { username: ' customer ', email: ' invalid ', password: ' secret ', confirmPassword: 'different' };
  const invalid = domain.validateCustomerRegistration(form);
  assert.equal(invalid.email, '請輸入有效的電子郵件。');
  assert.equal(invalid.confirmPassword, '兩次輸入的密碼不一致。');
  form.email = ' customer@example.com ';
  form.confirmPassword = ' secret ';
  assert.deepEqual(domain.validateCustomerRegistration(form), {});
  assert.deepEqual(domain.customerRegistrationPayload(form), { username: 'customer', email: 'customer@example.com', password: ' secret ' });
  assert.equal('confirmPassword' in domain.customerRegistrationPayload(form), false);
});

test('customer page has the approved fields, account intent, pending lock and success handoff', () => {
  const page = source('pages/RegisterPage.tsx');
  assert.match(page, /<AuthShell title="建立客戶帳號"/);
  assert.match(page, /<AccountTypeChoice selected="customer"/);
  assert.match(page, /merchantState=\{\{ registrationIdentity:/);
  assert.match(page, /saveMerchantRegistrationDraft\(\{ username: form\.username, email: form\.email \}\)/);
  assert.match(page, /使用者名稱/);
  assert.match(page, /電子郵件/);
  assert.match(page, /label="密碼"[\s\S]*?mode="new"[\s\S]*?autoComplete="new-password"/);
  assert.match(page, /label="確認密碼"[\s\S]*?mode="new"[\s\S]*?autoComplete="new-password"/);
  assert.match(page, /await api\.register\(customerRegistrationPayload\(form\)\)/);
  assert.match(page, /if \(submitting\.current\) return/);
  assert.match(page, /disabled=\{pending\}/);
  assert.match(page, /password: '', confirmPassword: ''/);
  assert.match(page, /navigate\('\/login\?registered=1', \{ replace: true \}\)/);
  assert.doesNotMatch(page, /refresh\(|api\.login|resolvePostAuthDestination|isBusiness|type="checkbox"/);
});

test('merchant validation requires a backend-provided category and maps exactly seven fields', () => {
  const form = { username: ' merchant ', email: 'merchant@example.com ', password: ' pass ', businessName: ' 店家 ', category: 'SPA', phone: ' 02-1234 ', address: ' 台北市 ' };
  assert.deepEqual(domain.validateMerchantRegistration(form, ['SPA']), {});
  assert.equal(domain.validateMerchantRegistration({ ...form, category: 'invented' }, ['SPA']).category, '請選擇有效的商家類別。');
  assert.deepEqual(domain.merchantRegistrationPayload(form), {
    username: 'merchant', email: 'merchant@example.com', password: ' pass ', businessName: '店家', category: 'SPA', phone: '02-1234', address: '台北市'
  });
});

test('merchant page separates account and business fields with category loading, retry and pending safety', () => {
  const page = source('pages/RegisterBusinessPage.tsx');
  assert.match(page, /<AuthShell variant="wide" title="建立商家帳號"/);
  assert.match(page, /<AccountTypeChoice selected="merchant"/);
  assert.match(page, /只想預約服務？建立客戶帳號/);
  assert.match(page, /<legend>帳號資料<\/legend>/);
  assert.match(page, /<legend>商家資料<\/legend>/);
  assert.match(page, /label="密碼"[\s\S]*?mode="new"[\s\S]*?autoComplete="new-password"/);
  assert.doesNotMatch(page, /confirmPassword|確認密碼/);
  assert.match(page, /await api\.businessCategories\(\)/);
  assert.match(page, /normalizeBusinessCategories\(response\.data\)/);
  assert.match(page, /type CategoryState = 'idle' \| 'loading' \| 'ready' \| 'error'/);
  assert.match(page, /暫時無法載入商家類別。/);
  assert.match(page, />重新載入<\/button>/);
  assert.match(page, /categoryState !== 'ready'/);
  assert.match(page, /await api\.registerBusiness\(merchantRegistrationPayload\(form\)\)/);
  assert.match(page, /if \(submitting\.current\) return/);
  assert.match(page, /clearMerchantRegistrationDraft\(\)/);
  assert.match(page, /navigate\('\/login\?registered=1', \{ replace: true \}\)/);
  assert.doesNotMatch(page, /refresh\(|api\.login|resolvePostAuthDestination|role:/);
});

test('merchant drafts migrate legacy sensitive state into a versioned non-sensitive payload', () => {
  const storage = new Map();
  globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const draft = loadModule('features/auth/merchantRegistrationDraft.ts');
  storage.set('businessRegisterDraft', JSON.stringify({ username: 'merchant', email: 'm@example.com', password: 'secret', confirmPassword: 'secret', businessName: '店家', category: 'SPA', phone: '1', address: 'A' }));
  assert.deepEqual(draft.loadMerchantRegistrationDraft(), { username: 'merchant', email: 'm@example.com', businessName: '店家', category: 'SPA', phone: '1', address: 'A' });
  const migrated = storage.get('businessRegisterDraft');
  assert.doesNotMatch(migrated, /password|secret|confirmPassword/i);
  assert.equal(JSON.parse(migrated).version, 1);
  storage.set('businessRegisterDraft', '{malformed');
  assert.equal(draft.loadMerchantRegistrationDraft(), null);
  assert.equal(storage.has('businessRegisterDraft'), false);
  draft.saveMerchantRegistrationDraft({ username: 'safe', password: 'never' });
  assert.doesNotMatch(storage.get('businessRegisterDraft'), /password|never/i);
  draft.clearMerchantRegistrationDraft();
  assert.equal(storage.has('businessRegisterDraft'), false);
});

test('registration errors use safe registration-specific copy without backend exception strings', () => {
  class ApiError extends Error { constructor(status) { super('raw backend exception'); this.status = status; } }
  const errors = loadModule('features/auth/authErrors.ts', {
    '../../api': { ApiError },
    '../../sessionEvents': { isUnauthorizedError: () => false }
  });
  assert.equal(errors.normalizeAuthError(new ApiError(400), 'customer-registration').message, '無法使用此帳號資料，請調整後重試。');
  assert.equal(errors.normalizeAuthError(new ApiError(429), 'merchant-registration').message, '嘗試過於頻繁，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new TypeError('Failed to fetch'), 'customer-registration').message, '無法連線，請確認網路後重試。');
  assert.equal(errors.normalizeAuthError(new ApiError(503), 'merchant-registration').message, '系統暫時無法建立帳號，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new Error('opaque'), 'merchant-registration').message, '無法建立帳號，請稍後再試。');
});

test('registration styling is scoped, responsive and keeps accessible touch targets', () => {
  const css = source('styles.css');
  const choice = source('features/auth/AccountTypeChoice.tsx');
  const shell = source('features/auth/AuthShell.tsx');
  assert.match(css, /\.auth-shell__surface--wide/);
  assert.match(css, /\.auth-registration__grid \{ display: grid/);
  assert.match(css, /min-height: 3\.4rem/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(choice, /aria-label="選擇帳號類型"/);
  assert.match(choice, /aria-current="page"/);
  assert.match(choice, /bi-check-lg/);
  assert.match(shell, /auth-shell__surface--wide/);
});
