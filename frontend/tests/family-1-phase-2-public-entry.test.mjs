import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadModule(path) {
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, () => { throw new Error('Unexpected dependency'); }, module);
  return module.exports;
}

test('public navigation provides only approved anonymous and customer routes', () => {
  const navigation = loadModule('features/public-entry/publicNavigation.ts');
  assert.deepEqual(navigation.publicNavigationItems(false), [
    { label: '我要預約', to: '/reservation/new', reservationLoginNotice: true },
    { label: '我是商家', to: '/register-business' },
    { label: '登入', to: '/login' },
    { label: '建立帳號', to: '/register', emphasis: 'primary' }
  ]);
  assert.deepEqual(navigation.publicNavigationItems(true), [
    { label: '儀表板', to: '/dashboard' },
    { label: '前往預約', to: '/reservation/new', emphasis: 'primary' },
    { label: '我的預約', to: '/my/reservations' }
  ]);
});

test('root route reserves the public entry surface for guests and sends signed-in users to their workspace', () => {
  const app = source('App.tsx');
  assert.match(app, /if \(loading\) return null;/);
  assert.match(app, /if \(!me\) return <PublicHomePage \/>;/);
  assert.match(app, /me\?\.role === 'ROLE_BUSINESS'/);
  assert.match(app, /<BusinessWorkspaceShell><OperationsOverviewPage/);
  assert.match(app, /return <Navigate to=\{resolvePostAuthDestination\(me\)\.path\} replace \/>;/);
  assert.doesNotMatch(app, /return <Layout><HomePage/);
});

test('public homepage is a scoped landmark-based shell with one heading and factual sections', () => {
  const home = source('features/public-entry/PublicHomePage.tsx');
  const hero = source('features/public-entry/PublicHero.tsx');
  const footer = source('features/public-entry/PublicFooter.tsx');
  assert.match(home, /className="public-entry"/);
  assert.match(home, /href="#main-content"/);
  assert.match(home, /<main id="main-content">/);
  assert.match(home, /<PublicHeader isCustomer/);
  assert.match(home, /<PublicFooter \/>/);
  assert.match(hero, /<h1 id="public-home-title"/);
  assert.match(hero, /aria-hidden="true"/);
  assert.match(hero, /開始預約/);
  assert.match(hero, /建立商家帳號/);
  assert.match(footer, /\/login/);
  assert.match(footer, /\/register-business/);
  assert.doesNotMatch(footer, /Spring Boot|Bootstrap|隱私|條款/);
});

test('mobile menu has dialog semantics, focus containment, Escape, backdrop and scroll cleanup', () => {
  const menu = source('features/public-entry/PublicMobileMenu.tsx');
  const css = source('styles.css');
  assert.match(menu, /role="dialog"/);
  assert.match(menu, /aria-modal="true"/);
  assert.match(menu, /event\.key === 'Escape'/);
  assert.match(menu, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(menu, /content\?\.setAttribute\('inert', ''\)/);
  assert.match(menu, /triggerRef\.current\?\.focus\(\)/);
  assert.match(menu, /onClick=\{onClose\}/);
  assert.match(css, /\.public-entry__menu-trigger \{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem;/);
  assert.match(css, /env\(safe-area-inset-top\)/);
});

test('public styles are scoped and maintain responsive no-product-shell composition', () => {
  const css = source('styles.css');
  assert.match(css, /\/\* Family 1 public entry surface/);
  assert.match(css, /\.public-entry \{/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(source('features/public-entry/PublicHomePage.tsx'), /Layout|Navbar|ToastContainer/);
});
