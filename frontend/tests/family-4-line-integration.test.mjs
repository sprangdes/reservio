import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-settings/line/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function load(path) { const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const module = { exports: {} }; Function('exports', 'require', 'module', code)(module.exports, () => ({})); return module.exports; }
const domain = load('lineIntegration.ts');

const raw = { configured: true, enabled: true, channelId: '2007623', channelSecretMasked: '••••cret', accessTokenMasked: '••••oken', webhookUrl: 'https://api.example.test/webhook/key' };
test('LINE settings normalize masked credentials without putting them in editable values', () => {
  const normalized = domain.normalizeLineSettings(raw);
  assert.equal(normalized.channelSecretInput, ''); assert.equal(normalized.accessTokenInput, '');
  assert.equal(normalized.hasStoredChannelSecret, true); assert.equal(normalized.hasStoredAccessToken, true);
  assert.notEqual(normalized, raw); assert.equal(domain.normalizeLineSettings({ ...raw, channelSecretMasked: 'plaintext' }), null);
});
test('LINE validation requires an effective configuration only when enabling', () => {
  const empty = { channelId: 'channel', channelSecretInput: '', accessTokenInput: '', hasStoredChannelSecret: false, hasStoredAccessToken: false, enabled: true, configured: false, webhookUrl: null };
  assert.deepEqual(domain.lineSettingsValidation(empty), { channelSecretInput: '請輸入 Channel Secret', accessTokenInput: '請輸入 Access Token' });
  assert.deepEqual(domain.lineSettingsValidation({ ...empty, enabled: false }), {});
  assert.deepEqual(domain.lineSettingsValidation({ ...empty, hasStoredChannelSecret: true, hasStoredAccessToken: true }), {});
  assert.deepEqual(domain.lineSettingsValidation({ ...empty, channelId: '  ' }), { channelId: 'Channel ID 不可只有空白', channelSecretInput: '請輸入 Channel Secret', accessTokenInput: '請輸入 Access Token' });
});
test('LINE save mapping preserves intentional blank credential fields and excludes display-only metadata', () => {
  const input = { channelId: ' channel ', channelSecretInput: '', accessTokenInput: 'replacement-token', hasStoredChannelSecret: true, hasStoredAccessToken: true, enabled: true, configured: true, webhookUrl: 'https://api.example.test/webhook/key' };
  assert.deepEqual(domain.lineSettingsPayload(input), { channelId: 'channel', channelSecret: '', accessToken: 'replacement-token', enabled: true });
  assert.equal(input.channelId, ' channel ');
});
test('LINE editor uses only supported APIs and keeps destructive operations outside form saving', () => {
  const editor = source('LineIntegrationEditor.tsx');
  assert.match(editor, /api\.lineIntegrationSettings/); assert.match(editor, /api\.saveLineIntegrationSettings/); assert.match(editor, /api\.disableLineIntegration/); assert.match(editor, /api\.rotateLineWebhookKey/); assert.match(editor, /api\.testLineIntegrationConnection/); assert.match(editor, /api\.provisionLineRichMenu/); assert.match(editor, /key: 'merchant-line-integration'/); assert.match(editor, /useModalFocusTrap/); assert.match(editor, /refreshSettingsOverviewSection\('lineSettings'\)/); assert.doesNotMatch(editor, /localStorage|sessionStorage|window\.confirm/);
});
