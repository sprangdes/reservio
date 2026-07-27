import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-settings/account/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function load(path) { const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const module = { exports: {} }; Function('exports', 'require', 'module', code)(module.exports, () => ({})); return module.exports; }
const domain = load('accountSettings.ts');

test('account identity only normalizes verified user-facing fields without exposing business data', () => {
  const raw = { username: '商家帳號', email: 'merchant@example.com', emailVerified: true, role: 'ROLE_BUSINESS', mustChangePassword: false, business: { id: 9, name: '不應使用' } };
  const normalized = domain.normalizeAccountIdentity(raw);
  assert.deepEqual(normalized, { displayName: '商家帳號', email: 'merchant@example.com', emailVerified: true, roleLabel: '商家帳號', mustChangePassword: false });
  assert.notEqual(normalized, raw); assert.equal(domain.normalizeAccountIdentity({ ...raw, emailVerified: 'true' }), null); assert.equal(domain.normalizeAccountIdentity({ ...raw, email: 'invalid' }), null);
});
test('account capability model never enables speculative merchant account actions', () => {
  const merchant = domain.accountSettingsCapabilities('ROLE_BUSINESS');
  assert.deepEqual(merchant, { canEditProfile: false, canChangePassword: false, canChangeEmail: false, canChangePhone: false, canManageMfa: false, canManageSessions: false, canDeleteAccount: false });
  assert.equal(domain.accountSettingsCapabilities('ROLE_USER').canEditProfile, true);
});
test('account summary derives only email verification and forced password status', () => {
  const identity = { displayName: null, email: 'merchant@example.com', emailVerified: false, roleLabel: '商家帳號', mustChangePassword: false };
  assert.deepEqual(domain.accountEmailStatus(identity), { status: 'attention', text: 'Email 尚未驗證' });
  assert.deepEqual(domain.accountSummary({ ...identity, mustChangePassword: true }), { status: 'attention', text: '需要完成強制密碼變更' });
  assert.equal(domain.accountSummary(null).status, 'unavailable');
});
test('merchant account page stays read-only, links only to supported account notifications, and preserves password boundary', () => {
  const page = source('AccountSettingsPage.tsx'); const profile = readFileSync(new URL('../src/pages/ProfilePage.tsx', import.meta.url), 'utf8'); const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(page, /\/business\/settings\/notifications/); assert.match(page, /商家帳號目前不提供個人資料編輯/); assert.match(page, /一般密碼變更與登入裝置管理目前不支援/); assert.doesNotMatch(page, /api\.|forceChangePassword|localStorage|sessionStorage/); assert.match(profile, /ROLE_USER/); assert.match(app, /path="\/force-change-password"/); assert.match(app, /mustChangePassword/);
});
