import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
function loadDomain() {
  const code = ts.transpileModule(source('features/line/lineDomain.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  Function('exports', 'require', 'module', code)(module.exports, () => ({}));
  return module.exports;
}

const line = loadDomain();
const page = source('pages/LineAccountLinkPage.tsx');
const css = source('styles.css');

test('Phase 4 account-link route uses the Phase 1 request parser and never persists or renders bearer-like values', () => {
  assert.match(page, /parseAccountLinkRequestToken\(location\.search\)/);
  assert.match(page, /api\.lineAccountLinkStatus\(request\.value\)/);
  assert.doesNotMatch(page, /sessionStorage|localStorage|console\.(log|debug)|request\.value\}</);
  assert.equal(line.safeInternalReturnTo('/line/account-link?request=opaque'), '/line/account-link?request=opaque');
  assert.equal(line.safeInternalReturnTo('//evil.example'), '/');
  assert.equal(line.safeInternalReturnTo('https://evil.example'), '/');
});

test('account-link states are deliberately distinct in the focused customer flow', () => {
  for (const text of ['連結 LINE 帳號', '等待 LINE 完成確認', '已完成連結', '連結未完成', '連結邀請已過期', '無法使用此連結']) assert.match(page, new RegExp(text));
  assert.match(page, /status\.state === 'expired'/);
  assert.match(page, /status\.state !== 'created'/);
  assert.match(page, /重新檢查狀態/);
  assert.doesNotMatch(page, /setInterval|setTimeout|輪詢/);
});

test('created request preserves existing LINE Login authority and customer-role gates', () => {
  assert.match(page, /me\?\.role === 'ROLE_USER' && me\.lineLoginSession/);
  assert.match(page, /商家帳號無法完成此 LINE 帳號連結/);
  assert.match(page, /\/login\?returnTo=/);
  assert.match(source('pages/LoginPage.tsx'), /safeInternalReturnTo/);
  assert.match(source('App.tsx'), /<PasswordResetGuard>/);
  assert.match(source('App.tsx'), /<BusinessSetupGuard>/);
});

test('confirm uses the existing payload-free API and validates the only approved external handoff before navigation', () => {
  assert.match(page, /api\.confirmLineAccountLink\(request\.value\)/);
  assert.match(page, /validateLineAccountLinkHandoff/);
  assert.match(page, /globalThis\.location\.assign\(redirectUrl\)/);
  assert.match(page, /if \(!redirectUrl\) throw new Error\('invalid handoff'\)/);
  assert.match(page, /if \(!request \|\| confirming\) return/);
  assert.doesNotMatch(page, /window\.(alert|confirm)|globalThis\.confirm/);
  assert.equal(line.validateLineAccountLinkHandoff('https://access.line.me/dialog/bot/accountLink?linkToken=opaque&nonce=opaque')?.startsWith('https://access.line.me/'), true);
  assert.equal(line.validateLineAccountLinkHandoff('javascript:alert(1)'), null);
  assert.equal(line.validateLineAccountLinkHandoff('https://evil.example/dialog/bot/accountLink?linkToken=opaque&nonce=opaque'), null);
});

test('expiration and recovery use authoritative data and safe source exits', () => {
  assert.match(page, /有效至 \{formatExpiry\(status\.expiresAt\)\}/);
  assert.match(page, /返回 LINE/);
  assert.match(page, /返回 Reservio/);
  assert.match(page, /globalThis\.history\.back\(\)/);
  assert.doesNotMatch(page, /Date\.now|countdown|倒數/);
  assert.match(page, /暫時無法確認這個 LINE 帳號連結狀態，請稍後再試。/);
});

test('focused desktop and mobile account-link shell has accessible, narrow-width-safe structure', () => {
  assert.match(page, /<main className="line-account-link" aria-labelledby="line-account-link-title">/);
  assert.match(page, /<h1 id="line-account-link-title">/);
  assert.match(page, /aria-label="返回 Reservio"/);
  assert.match(page, /role="status"|role="alert"/);
  assert.match(css, /\.line-account-link__mobile-header/);
  assert.match(css, /body:has\(\.line-account-link\)/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /min-height: 3\.25rem/);
  assert.match(css, /overflow-wrap: anywhere/);
});
