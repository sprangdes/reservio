import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadDestination() {
  const code = ts.transpileModule(source('features/auth/authDestination.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, () => ({}), module);
  return module.exports;
}

const destination = loadDestination();

test('final cross-family guard destinations cover every user state without role leakage', () => {
  const customer = { role: 'ROLE_USER', mustChangePassword: false };
  const merchant = { role: 'ROLE_BUSINESS', mustChangePassword: false, business: { id: 7 } };
  const incompleteMerchant = { role: 'ROLE_BUSINESS', mustChangePassword: false };

  assert.deepEqual(destination.resolvePostAuthDestination(customer), { path: '/dashboard', reason: 'role-default' });
  assert.deepEqual(destination.resolvePostAuthDestination(merchant), { path: '/', reason: 'role-default' });
  assert.deepEqual(destination.resolvePostAuthDestination(incompleteMerchant), { path: '/business/setup', reason: 'setup' });
  assert.equal(destination.resolvePostAuthDestination(customer, '/business/settings/profile').path, '/dashboard');
  assert.equal(destination.resolvePostAuthDestination(merchant, '/reservation/new').path, '/');
  assert.equal(destination.resolvePostAuthDestination({ ...customer, mustChangePassword: true }, '/reservation/new').path, '/force-change-password');
  assert.equal(destination.resolvePostAuthDestination({ ...merchant, mustChangePassword: true }, '/').path, '/force-change-password');
});

test('all protected customer ownership routes use the customer role boundary', () => {
  const app = source('App.tsx');
  for (const component of ['PreferredBusinessesPage', 'LineAccountLinksPage', 'ProfilePage']) {
    assert.match(app, new RegExp(`<RequireAuth><RequireCustomer><${component} \\/></RequireCustomer></RequireAuth>`));
  }
  assert.match(app, /<RequireAuth>\s*<RequireCustomer><ReservationNewPage \/><\/RequireCustomer>/);
  assert.match(app, /<RequireAuth>\s*<RequireCustomer><MyReservationsPage \/><\/RequireCustomer>/);
});

test('session expiry and logout clear every transient auth state and preserve server logout authority', () => {
  const timeout = source('components/SessionTimeoutManager.tsx');
  const navbar = source('components/Navbar.tsx');
  for (const item of ['clearReturnContext', 'clearPasswordResetState', 'clearMerchantRegistrationDraft']) {
    assert.match(timeout, new RegExp(`${item}\\(\\)`));
    assert.match(navbar, new RegExp(`${item}\\(\\)`));
  }
  assert.match(timeout, /await api\.logout\(\)/);
  assert.match(timeout, /UnauthorizedError|SESSION_EXPIRED|expireSession/);
  assert.match(navbar, /await api\.logout\(\)/);
});

test('LINE authentication, customer linking, and merchant Messaging API remain separate', () => {
  const api = source('api.ts');
  const login = source('pages/LoginPage.tsx');
  const link = source('pages/LineAccountLinkPage.tsx');
  const merchant = source('features/business-settings/line/LineIntegrationEditor.tsx');
  assert.match(login, /globalThis\.location\.assign\(`\$\{API_BASE\}\/api\/auth\/line\/\$\{kind\}`\)/);
  assert.match(login, /startLineLogin\('user'\)/);
  assert.match(login, /startLineLogin\('business'\)/);
  assert.match(link, /api\.lineAccountLinkStatus|api\.confirmLineAccountLink/);
  assert.doesNotMatch(link, /lineIntegrationSettings|saveLineIntegrationSettings/);
  assert.match(merchant, /api\.lineIntegrationSettings|api\.saveLineIntegrationSettings/);
  assert.doesNotMatch(merchant, /confirmLineAccountLink|linkedLineBusinesses/);
  assert.match(api, /\/api\/line\/account-links/);
  assert.match(api, /\/api\/integrations\/line\/settings/);
});

test('request transport cannot lose credentials or computed CSRF headers to caller options', () => {
  const api = source('api.ts');
  assert.match(api, /fetch\(`\$\{API_BASE\}\$\{path\}`, \{\s*\.\.\.options,\s*credentials: 'include',\s*headers\s*\}\)/);
  assert.match(api, /headers\['X-XSRF-TOKEN'\] = csrfToken/);
  assert.doesNotMatch(api, /credentials: 'include',\s*headers,\s*\.\.\.options/);
});
