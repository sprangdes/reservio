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
const settingsRaw = {
  configured: true,
  enabled: true,
  channelId: '2001234567',
  channelSecretMasked: '••••8k2p',
  accessTokenMasked: '••••4Wq9',
  webhookUrl: 'https://api.reservio.example/api/integrations/line/webhook/key'
};
const healthyStatusRaw = {
  configured: true,
  enabled: true,
  webhookReady: true,
  webhookMessage: 'Webhook URL 已設定且啟用',
  tokenValid: true,
  tokenMessage: 'Token 有效',
  richMenuReady: true,
  richMenuMessage: 'Rich Menu 已建立',
  richMenuId: 'rich-menu-id',
  checkedAt: '2026-08-08T14:32:00'
};

test('Family 6 keeps one canonical merchant route and a guarded compatibility redirect', () => {
  const app = source('App.tsx');
  assert.match(app, /path="\/business\/settings\/integrations\/line"/);
  assert.match(app, /path="\/business\/line-integration"/);
  assert.match(app, /Navigate to="\/business\/settings\/integrations\/line" replace/);
  assert.match(app, /path="\/line\/account-link"/);
  assert.match(app, /path="\/settings\/line-accounts"/);
  assert.match(app, /<PasswordResetGuard>/);
  assert.match(app, /<BusinessSetupGuard>/);
  assert.match(app, /<RequireAuth><SettingsRoute page="line" \/><\/RequireAuth>/);
  assert.match(app, /<Layout><LineAccountLinkPage \/><\/Layout>/);
  assert.match(app, /<Layout>\s*<RequireAuth>\s*<LineAccountLinksPage \/>/);
});

test('merchant integration normalization separates configuration and health without mutation', () => {
  const settings = structuredClone(settingsRaw);
  const health = structuredClone(healthyStatusRaw);
  const domain = line.normalizeBusinessLineIntegration(settings, health);
  assert.equal(domain.credentials.channelSecretMasked, '••••8k2p');
  assert.equal(domain.credentials.channelAccessTokenMasked, '••••4Wq9');
  assert.equal(domain.health.webhook.kind, 'healthy');
  assert.equal(domain.health.accessToken.kind, 'healthy');
  assert.equal(domain.health.richMenu.kind, 'healthy');
  assert.deepEqual(settings, settingsRaw);
  assert.deepEqual(health, healthyStatusRaw);
  assert.equal(line.normalizeBusinessLineIntegrationSettings({ ...settingsRaw, channelSecretMasked: 'secret' }), null);
  assert.equal(line.normalizeBusinessLineIntegrationHealth({ ...healthyStatusRaw, webhookReady: 'yes' }), null);
  const disabled = line.normalizeBusinessLineIntegrationHealth({ ...healthyStatusRaw, enabled: false });
  assert.equal(disabled.webhook.kind, 'unavailable');
  const attention = line.normalizeBusinessLineIntegrationHealth({ ...healthyStatusRaw, tokenValid: false });
  assert.equal(attention.accessToken.kind, 'attention');
  const unknown = line.normalizeBusinessLineIntegrationHealth({ ...healthyStatusRaw, webhookReady: false, checkedAt: null });
  assert.equal(unknown.webhook.kind, 'unknown');
});

test('credential mapping preserves saved credentials, rejects masks, and never mutates form input', () => {
  const settings = line.normalizeBusinessLineIntegrationSettings(settingsRaw);
  const form = { channelId: ' 2001234567 ', channelSecret: '', channelAccessToken: '' };
  assert.deepEqual(line.mapLineCredentialUpdate(form, settings, true), {
    channelId: '2001234567', channelSecret: '', accessToken: '', enabled: true
  });
  assert.deepEqual(form, { channelId: ' 2001234567 ', channelSecret: '', channelAccessToken: '' });
  assert.deepEqual(line.mapLineCredentialUpdate({ ...form, channelSecret: 'new-secret', channelAccessToken: 'new-token' }, settings, true), {
    channelId: '2001234567', channelSecret: 'new-secret', accessToken: 'new-token', enabled: true
  });
  assert.throws(() => line.mapLineCredentialUpdate({ ...form, channelSecret: '••••••' }, settings, true), /LINE_MASKED_CREDENTIAL_REJECTED/);
  const unsaved = line.normalizeBusinessLineIntegrationSettings({ ...settingsRaw, configured: false, enabled: false, channelId: null, channelSecretMasked: null, accessTokenMasked: null });
  assert.throws(() => line.mapLineCredentialUpdate({ channelId: 'id', channelSecret: '', channelAccessToken: '' }, unsaved, true), /LINE_CHANNEL_SECRET_REQUIRED/);
  assert.equal(line.hasSavedLineCredentials(settings), true);
  assert.equal(line.canTestLineConnection(settings), true);
  assert.equal(line.canProvisionRichMenu(settings, line.normalizeBusinessLineIntegrationHealth(healthyStatusRaw)), true);
  assert.equal(line.canRotateWebhookKey(settings), true);
  assert.equal(line.canDisableLineIntegration(settings), true);
});

test('account-link parsing and normalization protect the opaque request token', () => {
  const token = 'AbCdEfGhIjKlMnOp_1234567890';
  assert.deepEqual(line.parseAccountLinkRequestToken(`?request=${token}&ignored=value`), { value: token });
  assert.equal(line.parseAccountLinkRequestToken(''), null);
  assert.equal(line.parseAccountLinkRequestToken('?request=%20%20'), null);
  assert.equal(line.parseAccountLinkRequestToken('?request=not valid'), null);
  assert.equal(line.parseAccountLinkRequestToken(`?request=${token}&request=${token}`), null);
  for (const status of ['CREATED', 'AWAITING_LINE', 'COMPLETED', 'FAILED', 'EXPIRED']) {
    const normalized = line.normalizeLineAccountLinkRequest({ businessName: '森日髮廊', status, expiresAt: '2026-08-09T14:40:00' });
    assert.ok(normalized);
  }
  assert.equal(line.normalizeLineAccountLinkRequest({ businessName: '森日髮廊', status: 'UNKNOWN', expiresAt: '2026-08-09T14:40:00' }), null);
  assert.equal(line.normalizeLineAccountLinkRequest({ status: 'CREATED', expiresAt: '2026-08-09T14:40:00' }), null);
  const page = source('pages/LineAccountLinkPage.tsx');
  assert.match(page, /parseAccountLinkRequestToken/);
  assert.doesNotMatch(page, /sessionStorage|localStorage|console\.(log|debug)/);
});

test('external LINE account-link handoff allows only the confirmed destination', () => {
  const valid = 'https://access.line.me/dialog/bot/accountLink?linkToken=opaque&nonce=opaque';
  assert.equal(line.validateLineAccountLinkHandoff(valid), valid);
  assert.equal(line.validateLineAccountLinkHandoff('javascript:alert(1)'), null);
  assert.equal(line.validateLineAccountLinkHandoff('https://evil.example/dialog/bot/accountLink?linkToken=x&nonce=y'), null);
  assert.equal(line.validateLineAccountLinkHandoff('https://access.line.me/dialog/bot/accountLink?linkToken=x'), null);
});

test('linked-business domain is display-safe and unlink mapping only carries the opaque backend identifier', () => {
  const raw = [
    { lineCustomerId: 7, businessId: 123, businessName: '森日髮廊', linkedAt: '2026-07-16T09:00:00' },
    { lineCustomerId: 8, businessId: 456, businessName: '北巷整復所', linkedAt: '2026-04-21T09:00:00' }
  ];
  const normalized = line.normalizeLinkedLineBusinesses(raw);
  assert.deepEqual(normalized, [
    { unlinkId: 7, businessName: '森日髮廊', linkedAt: '2026-07-16T09:00:00' },
    { unlinkId: 8, businessName: '北巷整復所', linkedAt: '2026-04-21T09:00:00' }
  ]);
  assert.deepEqual(raw[0], { lineCustomerId: 7, businessId: 123, businessName: '森日髮廊', linkedAt: '2026-07-16T09:00:00' });
  assert.deepEqual(line.normalizeLinkedLineBusinesses([]), []);
  assert.equal(line.normalizeLinkedLineBusinesses([{ lineCustomerId: 7, businessName: '', linkedAt: '2026-07-16T09:00:00' }]), null);
  assert.equal(line.mapLineBusinessUnlinkInput(normalized[0]), 7);
  assert.throws(() => line.mapLineBusinessUnlinkInput({ unlinkId: 0 }), /LINE_UNLINK_IDENTIFIER_INVALID/);
  const page = source('pages/LineAccountLinksPage.tsx');
  assert.match(page, /normalizeLinkedLineBusinesses/);
  assert.doesNotMatch(page, /window\.(alert|confirm)|globalThis\.confirm/);
});

test('Family 6 error mapping does not return raw backend or provider content', () => {
  assert.equal(line.lineErrorCategory(new Error('Unauthorized')), 'authentication');
  assert.equal(line.lineErrorCategory(new Error('Forbidden')), 'authorization');
  assert.equal(line.lineErrorCategory(new Error('LINE provider returned linkToken=secret')), 'provider');
  assert.equal(line.lineErrorCategory(new Error('failed to fetch')), 'network');
  assert.equal(line.lineErrorCategory(new Error('LINE 帳號綁定連結已過期')), 'invalid-request');
  assert.equal(line.lineErrorCategory(new Error('malformed data')), 'malformed-data');
  assert.equal(line.lineSafeErrorMessage(new Error('LINE provider returned linkToken=secret')).includes('linkToken'), false);
});
