import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const editor = source('features/business-settings/line/LineIntegrationEditor.tsx');
const components = source('features/business-settings/line/LineIntegrationComponents.tsx');
const styles = source('styles.css');

test('Family 6 Phase 2 merchant page composes the approved settings hierarchy through focused components', () => {
  for (const component of ['BusinessLineConfigurationSummary', 'LineHealthList', 'LineCredentialEditor', 'LineWebhookSettings', 'LineIntegrationOperations', 'LineIntegrationDangerZone']) assert.match(editor, new RegExp(component));
  assert.match(editor, /title="LINE 整合"/);
  assert.match(editor, /設定商家的 LINE Messaging API/);
  assert.match(components, /Webhook/);
  assert.match(components, /Access Token/);
  assert.match(components, /Rich Menu/);
  assert.match(editor, /SettingsPageHeader title="LINE 整合"/);
});

test('merchant page uses normalized load, safe dirty save, stale recovery, and supported operational mutations', () => {
  for (const helper of ['normalizeBusinessLineIntegrationSettings', 'normalizeBusinessLineIntegrationHealth', 'createLineCredentialForm', 'mapLineCredentialUpdate', 'canTestLineConnection', 'canProvisionRichMenu']) assert.match(editor, new RegExp(helper));
  assert.match(editor, /useDirtyForm<EditorForm>/);
  assert.match(editor, /refreshSettingsOverviewSection\('lineSettings'\)/);
  assert.match(editor, /目前顯示的是先前載入的狀態，部分資訊可能尚未同步。/);
  assert.match(editor, /api\.testLineIntegrationConnection/);
  assert.match(editor, /api\.provisionLineRichMenu/);
  assert.doesNotMatch(editor, /window\.(alert|confirm)|localStorage|sessionStorage|console\.(log|debug)/);
});

test('credential and webhook presentation never creates a plaintext reveal', () => {
  assert.match(components, /type="password"/);
  assert.match(components, /不支援顯示既有 Secret/);
  assert.match(components, /不支援顯示既有 Token/);
  assert.match(components, /此 URL 僅用於 LINE Developers Console/);
  assert.match(components, /重新產生 Webhook 金鑰/);
  assert.match(components, /停用 LINE 整合/);
  assert.match(components, /canRotate/);
  assert.doesNotMatch(components, /window\.(alert|confirm)|navigator\.clipboard\.readText|type="text"[^>]*Channel Secret/);
});

test('responsive and accessibility hooks preserve the approved single-column mobile experience', () => {
  for (const selector of ['.line-integration__summary', '.line-integration__health ul', '.line-integration__credentials', '.line-integration__webhook-url', '.line-integration__danger-zone']) assert.match(styles, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(styles, /@media \(max-width: 768px\)/);
  assert.match(components, /aria-labelledby/);
  assert.match(components, /role="status"/);
  assert.doesNotMatch(components, /bi-chevron/);
});
