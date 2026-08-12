import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadModule(path, dependencies = {}) {
  const code = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, (id) => dependencies[id] ?? (() => {
    throw new Error(`Unexpected dependency ${id}`);
  })(), module);
  return module.exports;
}

const destination = loadModule('features/auth/authDestination.ts');

test('final returnTo boundary rejects encoded attacks and unclassified route descendants', () => {
  const rejected = [
    '/reservation/new?value=%E0%A4%A',
    '/reservation/new?value=%00',
    '/reservation/new?value=%5C%5Cevil.example',
    '/%2F%2Fevil.example',
    '/service/unknown',
    '/business/settings/unknown',
    '/business/settings/profile/unknown'
  ];
  for (const value of rejected) assert.equal(destination.safeInternalReturnTo(value), null, value);

  const accepted = [
    '/reservation/new?business=7',
    '/my/reservations?status=PENDING',
    '/service/7/edit',
    '/business/settings/profile',
    '/business/settings/integrations/line'
  ];
  for (const value of accepted) assert.equal(destination.safeInternalReturnTo(value), value, value);
});

test('global guard matrix keeps loading, force-change, setup and role priorities explicit', () => {
  const app = source('App.tsx');
  assert.match(app, /function PasswordResetGuard[\s\S]*if \(loading\)[\s\S]*me\?\.mustChangePassword/);
  assert.match(app, /function BusinessSetupGuard[\s\S]*ROLE_BUSINESS[\s\S]*!me\.business/);
  assert.match(app, /function RequireCustomer[\s\S]*buildLoginPath[\s\S]*resolvePostAuthDestination/);
  assert.match(app, /function RequireBusiness[\s\S]*buildLoginPath[\s\S]*resolvePostAuthDestination/);
  assert.match(app, /path="\/force-change-password"[\s\S]*<RequireAuth>[\s\S]*<ForceChangeRouteGuard>/);
  assert.match(app, /path="\*" element=\{<Navigate to="\/" replace \/>\}/);
});

test('root ownership remains public for anonymous and customers and workspace-only for merchants', () => {
  const app = source('App.tsx');
  assert.match(app, /function BusinessAwareHome\(\)[\s\S]*if \(loading\) return null/);
  assert.match(app, /me\?\.role === 'ROLE_BUSINESS'[\s\S]*BusinessWorkspaceShell><OperationsOverviewPage/);
  assert.match(app, /return <PublicHomePage \/>/);
  assert.doesNotMatch(source('features/public-entry/PublicHomePage.tsx'), /api\.|ReservationNewPage|MyReservationsPage/);
});

test('LINE callback handling is authoritative, race-locked and consumes failed callback parameters', () => {
  const app = source('App.tsx');
  const login = source('pages/LoginPage.tsx');
  assert.match(app, /lineLogin === 'success' \|\| lineLogin === 'failed'/);
  assert.match(login, /authActionRef\.current/);
  assert.match(login, /if \(authActionRef\.current \|\| isBusy\) return/);
  assert.match(login, /const user = await refresh\(\)/);
  assert.match(login, /params\.delete\('lineLogin'\)/);
  assert.match(login, /params\.delete\('reason'\)/);
  assert.match(login, /params\.delete\('role'\)/);
  assert.doesNotMatch(login, /params\.get\('role'\)|state\.role|queryRole/);
});

test('customer LINE return context accepts classified customer routes and rejects merchant routes', () => {
  const presentation = loadModule('features/auth/loginPresentation.ts', { './authDestination': destination });
  assert.equal(presentation.customerLineReturnContext('/reservation/new?business=9'), '/reservation/new?business=9');
  assert.equal(presentation.customerLineReturnContext('/my/reservations'), '/my/reservations');
  assert.equal(presentation.customerLineReturnContext('/profile'), null);
  assert.equal(presentation.customerLineReturnContext('/reservation/manage'), null);
  assert.equal(presentation.customerLineReturnContext('/business/settings/profile'), null);
});

test('short-lived return context rejects malformed, expired and future session state and consumes once', () => {
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  };
  const context = loadModule('features/auth/returnContext.ts', { './authDestination': destination });
  context.persistReturnContext('/reservation/new');
  assert.equal(context.consumeReturnContext(), '/reservation/new');
  assert.equal(context.consumeReturnContext(), null);
  storage.set('reservio.auth.return-context.v1', JSON.stringify({ version: 1, path: '/reservation/new', createdAt: Date.now() + 1_000 }));
  assert.equal(context.peekReturnContext(), null);
  storage.set('reservio.auth.return-context.v1', JSON.stringify({ version: 1, path: '/reservation/new', createdAt: Number.NaN }));
  assert.equal(context.peekReturnContext(), null);
});

test('all focused Family 1 acquisition routes use the shared AuthShell', () => {
  const routes = [
    ['pages/LoginPage.tsx', '登入 Reservio'],
    ['pages/RegisterPage.tsx', '建立客戶帳號'],
    ['pages/RegisterBusinessPage.tsx', '建立商家帳號'],
    ['pages/ForgotPasswordPage.tsx', '忘記密碼'],
    ['pages/ForgotPasswordVerifyPage.tsx', '輸入驗證碼'],
    ['pages/ForceChangePasswordPage.tsx', '設定新密碼']
  ];
  for (const [path, title] of routes) {
    const page = source(path);
    assert.match(page, /<AuthShell/);
    assert.match(page, new RegExp(`title="${title}"`));
    assert.doesNotMatch(page, /<Layout|<Navbar|<Footer/);
  }
});

test('registration and recovery mutations remain exact, non-optimistic and secret-safe', () => {
  const customer = source('pages/RegisterPage.tsx');
  const merchant = source('pages/RegisterBusinessPage.tsx');
  const recovery = source('pages/ForgotPasswordVerifyPage.tsx');
  const force = source('pages/ForceChangePasswordPage.tsx');
  assert.match(customer, /api\.register\(customerRegistrationPayload\(form\)\)/);
  assert.match(merchant, /api\.registerBusiness\(merchantRegistrationPayload\(form\)\)/);
  assert.match(recovery, /await api\.verifyPasswordResetOtp[\s\S]*const user = await refresh\(\)/);
  assert.match(force, /api\.forceChangePassword\(\{ newPassword \}\)[\s\S]*const user = await refresh\(\)/);
  assert.equal((force.match(/<PasswordField/g) || []).length, 1);
  assert.doesNotMatch(force, /confirmPassword|oldPassword/);
});

test('Family 1 sensitive persistence and diagnostics remain bounded', () => {
  const draft = source('features/auth/merchantRegistrationDraft.ts');
  const reset = source('features/auth/passwordResetState.ts');
  const context = source('features/auth/returnContext.ts');
  assert.doesNotMatch(draft, /sessionStorage\.setItem\([^\n]*(password|confirmPassword|otp)/i);
  assert.match(reset, /const state = \{ identifier: normalized, requestedAt: Date\.now\(\) \}/);
  assert.doesNotMatch(reset, /const state = \{[^\n]*(otp|newPassword|token)/i);
  assert.match(context, /JSON\.stringify\(\{ version: 1, path, createdAt: Date\.now\(\) \}/);
  assert.doesNotMatch(context, /JSON\.stringify\(\{[^\n]*(role|password|otp|token)/i);
  assert.doesNotMatch(source('pages/LoginPage.tsx'), /console\.(log|debug|info)|params\.get\('role'\)/);
});

test('responsive and accessibility contracts remain scoped to Family 1 shells', () => {
  const css = source('styles.css');
  const publicHome = source('features/public-entry/PublicHomePage.tsx');
  const menu = source('features/public-entry/PublicMobileMenu.tsx');
  const otp = source('features/auth/OtpInput.tsx');
  assert.match(css, /\.auth-shell \{[\s\S]*min-height: 100dvh/);
  assert.match(css, /\.public-entry \{[\s\S]*min-height: 100dvh/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(publicHome, /跳至主要內容/);
  assert.match(menu, /role="dialog" aria-modal="true"/);
  assert.match(menu, /event\.key === 'Escape'/);
  assert.match(menu, /triggerRef\.current\?\.focus\(\)/);
  assert.match(otp, /inputMode="numeric"/);
  assert.match(otp, /autoComplete="one-time-code"/);
});

test('Families 2-6 canonical boundary routes remain registered without public-shell wrapping', () => {
  const app = source('App.tsx');
  for (const route of [
    '/reservation/new',
    '/my/reservations',
    '/reservation/manage',
    '/business/setup',
    '/business/info',
    '/business/settings/profile',
    '/notifications/settings',
    '/profile',
    '/line/account-link',
    '/settings/line-accounts',
    '/business/settings/integrations/line'
  ]) assert.match(app, new RegExp(`path="${route.replaceAll('/', '\\/')}"`));
  assert.doesNotMatch(app, /<PublicHomePage>[\s\S]*(BusinessWorkspaceShell|ReservationNewPage|BusinessSetupPage)/);
});
