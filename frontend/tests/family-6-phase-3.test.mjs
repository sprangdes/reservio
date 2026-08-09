import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const editor = source('features/business-settings/line/LineIntegrationEditor.tsx');
const components = source('features/business-settings/line/LineIntegrationComponents.tsx');
const styles = source('styles.css');

test('Phase 3 wires only the existing merchant high-risk APIs through confirmation state', () => {
  assert.match(editor, /api\.rotateLineWebhookKey/);
  assert.match(editor, /api\.disableLineIntegration/);
  assert.match(editor, /runHighRiskOperation/);
  assert.match(editor, /confirmation/);
  assert.match(editor, /canRotateWebhookKey/);
  assert.match(editor, /canDisableLineIntegration/);
  assert.match(editor, /refreshSettingsOverviewSection\('lineSettings'\)/);
  assert.doesNotMatch(editor, /window\.(alert|confirm)|localStorage|sessionStorage|console\.(log|debug)/);
});

test('rotation confirmation contains approved impact copy and accessible pending-safe dialog behavior', () => {
  assert.match(components, /重新產生 Webhook 金鑰？/);
  assert.match(components, /目前的 Webhook URL 會立即失效。請在 LINE Developers Console 更新新的 URL。Channel Secret 與 Access Token 會保留。/);
  assert.match(components, /需要到 LINE Developers Console 更新/);
  assert.match(components, /role="alertdialog"/);
  assert.match(components, /aria-modal="true"/);
  assert.match(components, /useModalFocusTrap/);
  assert.match(components, /element\.inert = true/);
  assert.match(components, /element\.inert = inert/);
  assert.match(components, /event\.key === 'Escape' && !pending/);
  assert.match(components, /disabled=\{pending\}/);
});

test('disable confirmation explicitly retains credentials and stays separate from credential form drafts', () => {
  assert.match(components, /停用 LINE 整合？/);
  assert.match(components, /目前已儲存的 LINE 憑證會保留，之後可重新啟用。/);
  assert.match(editor, /if \(!form\.isDirty\) form\.reset/);
  assert.match(editor, /form\.markStale\(false\)/);
  assert.doesNotMatch(components, /type="text"[^>]*Channel Secret|navigator\.clipboard\.readText/);
});

test('post-mutation authoritative refresh handles new URLs and stale/unconfirmed recovery safely', () => {
  assert.match(editor, /refreshAfterHighRiskMutation/);
  assert.match(editor, /api\.lineIntegrationSettings/);
  assert.match(editor, /api\.lineIntegrationStatus/);
  assert.match(editor, /Webhook 金鑰已重新產生，但目前無法確認最新的 Webhook URL。請重新載入設定。/);
  assert.match(editor, /停用操作已送出，但目前無法確認最新的 LINE 整合狀態。/);
  assert.match(editor, /unconfirmedHealth/);
  assert.match(editor, /setSettings\(responseSettings\)/);
});

test('desktop dialog and mobile safe-area bottom-sheet styles retain the Family 4 presentation system', () => {
  assert.match(styles, /\.line-integration__confirmation-dialog/);
  assert.match(styles, /\.business-settings__dialog-layer/);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*line-integration__confirmation-dialog/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /min-height: 3rem/);
});
