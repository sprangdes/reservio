import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const app = source('App.tsx');
const navbar = source('components/Navbar.tsx');
const merchant = source('features/business-settings/line/LineIntegrationEditor.tsx');
const accountLink = source('pages/LineAccountLinkPage.tsx');
const linkedBusinesses = source('pages/LineAccountLinksPage.tsx');
const domain = source('features/line/lineDomain.ts');
const returnContext = source('features/auth/returnContext.ts');

test('Family 6 retains one canonical route per domain and a non-looping merchant compatibility redirect', () => {
  assert.match(app, /path="\/business\/settings\/integrations\/line"/);
  assert.match(app, /path="\/business\/line-integration"/);
  assert.match(app, /Navigate to="\/business\/settings\/integrations\/line" replace/);
  assert.match(app, /path="\/line\/account-link"/);
  assert.match(app, /path="\/settings\/line-accounts"/);
  assert.match(navbar, /to="\/business\/settings\/integrations\/line"/);
  assert.doesNotMatch(navbar, /to="\/business\/line-integration"/);
});

test('Family 6 mutation refresh failures always resolve pending local state without discarding safe drafts', () => {
  assert.match(merchant, /form\.completeFailure\('設定已送出，但目前無法確認最新 LINE 整合狀態。請重新載入設定。'\)/);
  assert.match(merchant, /Webhook 金鑰已重新產生，但目前無法確認最新的 Webhook URL。請重新載入設定。/);
  assert.match(merchant, /停用操作已送出，但目前無法確認最新的 LINE 整合狀態。/);
  assert.match(merchant, /if \(!form\.isDirty\) form\.reset/);
  assert.match(merchant, /else form\.markStale\(false\)/);
});

test('Family 6 account-link only persists its safe internal return path for the existing LINE Login handoff', () => {
  assert.match(accountLink, /persistReturnContext\(`\$\{location\.pathname\}\$\{location\.search\}`\)/);
  assert.doesNotMatch(accountLink, /sessionStorage|localStorage/);
  assert.match(accountLink, /globalThis\.location\.assign\(`\$\{API_BASE\}\/api\/auth\/line\/user`\)/);
  assert.doesNotMatch(accountLink, /localStorage|console\.(log|debug)|request\.value\}</);
  assert.doesNotMatch(domain, /safeInternalReturnTo/);
  assert.match(returnContext, /safeInternalReturnTo\(source\)/);
});

test('Family 6 linked-business stale recovery preserves even an authoritative empty result and keeps unlink identity internal', () => {
  assert.match(linkedBusinesses, /hasAuthoritativeListRef/);
  assert.match(linkedBusinesses, /if \(hasAuthoritativeList\)/);
  assert.match(linkedBusinesses, /setStaleMessage\(unlinkRefreshError\)/);
  assert.match(linkedBusinesses, /mapLineBusinessUnlinkInput\(selected\)/);
  assert.doesNotMatch(linkedBusinesses, /lineCustomerId|businessId|window\.confirm|window\.alert/);
});
