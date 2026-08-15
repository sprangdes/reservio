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

test('login return presentation exposes only factual approved customer contexts', () => {
  const presentation = loadModule('features/auth/loginPresentation.ts', { './authDestination': { safeInternalReturnTo: (value) => typeof value === 'string' && ['/reservation/new', '/my/reservations'].includes(value.split('?')[0]) ? value : null } });
  assert.deepEqual(presentation.loginReturnPresentation('/reservation/new'), { path: '/reservation/new', title: '登入後將繼續預約', description: '完成登入後，會回到你剛才的預約流程。' });
  assert.deepEqual(presentation.loginReturnPresentation('/my/reservations'), { path: '/my/reservations', title: '登入後將回到我的預約', description: '完成登入後，會回到你的預約狀態。' });
  assert.equal(presentation.loginReturnPresentation('/reservation/manage'), null);
  assert.equal(presentation.loginReturnPresentation('https://evil.example'), null);
  assert.equal(presentation.customerLineReturnContext('/reservation/new'), '/reservation/new');
  assert.equal(presentation.customerLineReturnContext('/my/reservations'), '/my/reservations');
});

test('login shows the return notice only when continuing a new reservation', () => {
  const login = source('pages/LoginPage.tsx');
  const app = source('App.tsx');
  assert.match(login, /reservationLoginNotice && returnPresentation\?\.path === '\/reservation\/new'/);
  assert.match(app, /<Navigate to=\{buildLoginPath\(location\.pathname, location\.search\)\} state=\{location\.state\} replace \/>/);
  assert.doesNotMatch(login, /登入你的 Reservio 帳號/);
  assert.doesNotMatch(login, /登入後會依你的帳號類型前往對應的 Reservio 工作區/);
});

test('login uses an isolated AuthShell, correct credential semantics and shared PasswordField', () => {
  const app = source('App.tsx');
  const login = source('pages/LoginPage.tsx');
  const shell = source('features/auth/AuthShell.tsx');
  const header = source('components/SiteHeader.tsx');
  const publicHeader = source('features/public-entry/PublicHeader.tsx');
  assert.match(app, /<AuthRouteRedirect><LoginPage \/><\/AuthRouteRedirect>/);
  assert.doesNotMatch(app, /<AuthRouteRedirect><Layout><LoginPage/);
  assert.match(login, /<AuthShell title="登入 Reservio"/);
  assert.match(login, /<form className="auth-login"/);
  assert.match(login, /使用者名稱/);
  assert.doesNotMatch(login, /使用者名稱\s*\/\s*電子郵件/);
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /<PasswordField[^>]*mode="current"/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(shell, /<main className="auth-shell__main"/);
  assert.match(shell, /<SiteHeader className="auth-shell__header">/);
  assert.match(publicHeader, /<SiteHeader className="public-entry__header">/);
  assert.match(header, /Reservio 首頁/);
  assert.match(shell, /返回首頁/);
});

test('credential mutation uses exact payload, locks actions, refreshes authoritatively and never routes from login response', () => {
  const login = source('pages/LoginPage.tsx');
  assert.match(login, /await api\.login\(\{ username: username\.trim\(\), password \}\)/);
  assert.match(login, /const user = await refresh\(\)/);
  assert.match(login, /if \(!user\) \{/);
  assert.match(login, /登入已完成，但目前無法確認帳號狀態/);
  assert.match(login, /resolvePostAuthDestination\(user, returnTo\)/);
  assert.match(login, /if \(authActionRef\.current \|\| isBusy\) return;/);
  assert.match(login, /setPassword\(''\)/);
  assert.match(login, /normalizeAuthError\(requestError, 'login'\)/);
  assert.match(login, /disabled=\{isBusy\}/);
  assert.doesNotMatch(login, /\.data\.role|\.data\.business/);
});

test('registered status is polite and query is removed once', () => {
  const login = source('pages/LoginPage.tsx');
  assert.match(login, /params\.get\('registered'\) === '1'/);
  assert.match(login, /setRegistered\(true\)/);
  assert.match(login, /params\.delete\('registered'\)/);
  assert.match(login, /navigate\(\{ pathname: '\/login'/);
  assert.match(login, /role="status">帳號已建立，請登入。/);
});

test('LINE starts only real endpoints, customer stores only compatible context, merchant clears it and callback refreshes before resolver', () => {
  const login = source('pages/LoginPage.tsx');
  const app = source('App.tsx');
  assert.match(login, /globalThis\.location\.assign\(`\$\{API_BASE\}\/api\/auth\/line\/\$\{kind\}`\)/);
  assert.match(login, /startLineLogin\('user'\)/);
  assert.match(login, /startLineLogin\('business'\)/);
  assert.match(login, /customerLineReturnContext/);
  assert.match(login, /if \(kind === 'user'\)/);
  assert.match(login, /else \{\s*clearReturnContext\(\)/);
  assert.match(login, /params\.get\('lineLogin'\) === 'success'/);
  assert.match(login, /const user = await refresh\(\)/);
  assert.match(app, /lineLogin === 'success' \|\| lineLogin === 'failed'/);
  assert.doesNotMatch(login, /state: \{ lineRole|params\.get\('role'\)/);
});

test('auth shell styles remain scoped, responsive and accessible', () => {
  const css = source('styles.css');
  const password = source('features/auth/PasswordField.tsx');
  assert.match(css, /\.auth-shell \{/);
  assert.match(css, /min-height: 100dvh/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /min-height: 3\.4rem/);
  assert.match(password, /aria-pressed/);
  assert.match(password, /type="button"/);
  assert.match(password, /minWidth: 44/);
});

test('login normalization exposes the approved safe server and fallback copy', () => {
  class ApiError extends Error { constructor(status) { super('raw backend detail'); this.status = status; } }
  const errors = loadModule('features/auth/authErrors.ts', {
    '../../api': { ApiError },
    '../../sessionEvents': { isUnauthorizedError: () => false }
  });
  assert.equal(errors.normalizeAuthError(new ApiError(503), 'login').message, '系統暫時無法完成登入，請稍後再試。');
  assert.equal(errors.normalizeAuthError(new Error('opaque'), 'login').message, '無法完成登入，請稍後再試。');
});
