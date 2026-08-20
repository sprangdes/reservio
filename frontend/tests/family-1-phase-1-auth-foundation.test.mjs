import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadModule(path, dependencies = {}) {
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (id) => dependencies[id] ?? (() => { throw new Error(`Unexpected dependency: ${id}`); })();
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const destination = loadModule('features/auth/authDestination.ts');

test('safeInternalReturnTo accepts only known safe internal destinations', () => {
  assert.equal(destination.safeInternalReturnTo('/reservation/new'), '/reservation/new');
  assert.equal(destination.safeInternalReturnTo('/my/reservations?x=1#ignore'), '/my/reservations?x=1');
  for (const value of ['https://evil.example', 'http://evil.example', '//evil.example', '\\evil', '/bad\u0000path', '/%E0%A4%A', '/login', '/unknown']) {
    assert.equal(destination.safeInternalReturnTo(value), null);
  }
});

test('role compatibility and destination resolution preserve priority', () => {
  const customer = { role: 'ROLE_USER' };
  const merchant = { role: 'ROLE_BUSINESS', business: { id: 1 } };
  const incompleteMerchant = { role: 'ROLE_BUSINESS' };
  assert.equal(destination.isRoleCompatibleDestination(customer, '/reservation/new'), true);
  assert.equal(destination.isRoleCompatibleDestination(customer, '/business/settings'), false);
  assert.equal(destination.isRoleCompatibleDestination(merchant, '/reservation/manage'), true);
  assert.equal(destination.isRoleCompatibleDestination(merchant, '/reservation/new'), false);
  assert.equal(destination.isRoleCompatibleDestination(customer, '/unknown'), false);
  assert.deepEqual(destination.resolvePostAuthDestination(customer, '/my/reservations'), { path: '/my/reservations', reason: 'return-to' });
  assert.deepEqual(destination.resolvePostAuthDestination(customer, '/business/settings'), { path: '/dashboard', reason: 'role-default' });
  assert.deepEqual(destination.resolvePostAuthDestination(merchant, '/reservation/new'), { path: '/', reason: 'role-default' });
  assert.deepEqual(destination.resolvePostAuthDestination(incompleteMerchant, '/reservation/manage'), { path: '/business/setup', reason: 'setup' });
  assert.deepEqual(destination.resolvePostAuthDestination({ ...merchant, mustChangePassword: true }, '/reservation/manage'), { path: '/force-change-password', reason: 'force-change' });
});

test('merchant registration draft omits secrets and reset state expires safely', () => {
  const storage = new Map();
  globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const draft = loadModule('features/auth/merchantRegistrationDraft.ts');
  const reset = loadModule('features/auth/passwordResetState.ts');
  draft.saveMerchantRegistrationDraft({ username: 'merchant', email: 'm@example.com', password: 'secret', businessName: '店家' });
  assert.doesNotMatch(storage.get('businessRegisterDraft'), /secret|password/);
  assert.deepEqual(draft.loadMerchantRegistrationDraft(), { username: 'merchant', email: 'm@example.com', businessName: '店家', category: '', phone: '', address: '' });
  storage.set('businessRegisterDraft', '{broken');
  assert.equal(draft.loadMerchantRegistrationDraft(), null);
  reset.savePasswordResetState('m@example.com');
  assert.deepEqual(reset.loadPasswordResetState()?.identifier, 'm@example.com');
  assert.doesNotMatch(storage.get('reservio.auth.password-reset.v1'), /otp|password/i);
  storage.set('reservio.auth.password-reset.v1', JSON.stringify({ identifier: 'old@example.com', requestedAt: Date.now() - 16 * 60 * 1000 }));
  assert.equal(reset.loadPasswordResetState(), null);
  reset.clearPasswordResetState();
  assert.equal(reset.loadPasswordResetState(), null);
});

test('return context stores only safe destinations and auth errors remain normalized', () => {
  const storage = new Map();
  globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const context = loadModule('features/auth/returnContext.ts', { './authDestination': destination });
  assert.equal(context.persistReturnContext('/my/reservations?next=1'), '/my/reservations?next=1');
  assert.equal(context.peekReturnContext(), '/my/reservations?next=1');
  assert.equal(context.consumeReturnContext(), '/my/reservations?next=1');
  assert.equal(context.peekReturnContext(), null);
  assert.equal(context.persistReturnContext('https://evil.example'), null);
  assert.equal(storage.size, 0);

  class ApiError extends Error { constructor(status) { super('backend detail'); this.status = status; } }
  class UnauthorizedError extends Error {}
  const errors = loadModule('features/auth/authErrors.ts', {
    '../../api': { ApiError },
    '../../sessionEvents': { isUnauthorizedError: (error) => error instanceof UnauthorizedError }
  });
  assert.equal(errors.normalizeAuthError(new ApiError(401), 'login').category, 'INVALID_CREDENTIALS');
  assert.equal(errors.normalizeAuthError(new ApiError(400), 'merchant-registration').category, 'DUPLICATE_IDENTITY');
  assert.equal(errors.normalizeAuthError(new ApiError(400), 'otp-verify').category, 'OTP_INVALID_OR_EXPIRED');
  assert.equal(errors.normalizeAuthError(new ApiError(429), 'login').category, 'RATE_LIMITED');
  assert.equal(errors.normalizeAuthError(new ApiError(503), 'login').category, 'SERVER');
  assert.equal(errors.normalizeAuthError(new UnauthorizedError(), 'force-change').category, 'SESSION_EXPIRED');
});

test('Phase 1 pages use the shared password component and authoritative refresh flow', () => {
  const login = source('pages/LoginPage.tsx');
  const forceChange = source('pages/ForceChangePasswordPage.tsx');
  const passwordField = source('features/auth/PasswordField.tsx');
  assert.match(login, /使用者名稱<\/label>/);
  assert.match(login, /await refresh\(\)/);
  assert.match(login, /resolvePostAuthDestination/);
  assert.match(forceChange, /<PasswordField/);
  assert.doesNotMatch(forceChange, /confirmPassword|確認新密碼/);
  assert.match(forceChange, /api\.forceChangePassword\(\{ newPassword \}\)/);
  assert.match(forceChange, /await refresh\(\)/);
  assert.match(passwordField, /aria-pressed/);
  assert.match(passwordField, /minWidth: 44/);
  assert.match(passwordField, /htmlFor=\{id\}/);
});
