import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  Function('exports', 'require', 'module', code)(module.exports, () => ({}), module);
  return module.exports;
}

test('canonical merchant routes, compatibility routes, and guards remain present', () => {
  const app = source('App.tsx');
  for (const path of ['/business/settings', '/business/settings/profile', '/business/settings/booking', '/business/settings/hours', '/business/settings/notifications', '/business/settings/integrations/line', '/business/settings/account', '/service/manage', '/service/new', '/service/:id/edit', '/business/info', '/notifications/settings', '/business/line-integration']) {
    assert.match(app, new RegExp(path.replace(/[/:]/g, '\\$&')));
  }
  assert.match(app, /PasswordResetGuard/);
  assert.match(app, /BusinessSetupGuard/);
  assert.match(app, /RequireBusiness/);
  assert.match(app, /BusinessWorkspaceShell><BusinessInfoPage/);
  assert.match(app, /<Layout><NotificationSettingsPage \/><\/Layout>/);
});

test('legacy business info is an accessible compatibility hub, not another writable editor', () => {
  const legacy = source('features/business-settings/LegacyBusinessInfoCompatibility.tsx');
  assert.match(legacy, /<h1>商家資訊<\/h1>/);
  for (const destination of ['/business/settings/profile', '/business/settings/booking', '/business/settings/hours', '/service/manage']) assert.match(legacy, new RegExp(destination.replace(/[/:]/g, '\\$&')));
  assert.doesNotMatch(legacy, /BusinessHoursEditor|useDirtyForm|api\./);
});

test('settings overview refresh stays domain-bounded and landing errors retain stale summaries', () => {
  const overview = source('features/business-settings/hooks/useSettingsOverview.ts');
  const page = source('features/business-settings/SettingsPages.tsx');
  for (const section of ['slots', 'services', 'notifications', 'lineSettings', 'lineStatus']) assert.match(overview, new RegExp(section));
  assert.match(page, /設定摘要可能已過期/);
  assert.match(page, /服務摘要可能已過期/);
  assert.match(page, /settingsRouteConfig\.serviceManage/);
  assert.doesNotMatch(page, /Session 管理與帳號刪除尚未提供/);
});

test('LINE request mapping never uses masked values and successful saves clear plaintext inputs', () => {
  const line = load('features/business-settings/line/lineIntegration.ts');
  const editor = source('features/business-settings/line/LineIntegrationEditor.tsx');
  const normalized = line.normalizeLineSettings({ configured: true, enabled: true, channelId: 'channel', channelSecretMasked: '••••••', accessTokenMasked: '••••••', webhookUrl: 'https://example.test/webhook' });
  assert.equal(normalized.channelSecretInput, '');
  assert.equal(normalized.accessTokenInput, '');
  assert.deepEqual(line.lineSettingsPayload({ ...normalized, channelSecretInput: 'secret', accessTokenInput: 'token' }), { channelId: 'channel', channelSecret: 'secret', accessToken: 'token', enabled: true });
  assert.match(editor, /createLineCredentialForm/);
  assert.match(editor, /mapLineCredentialUpdate/);
  assert.doesNotMatch(editor, /localStorage|sessionStorage|window\.confirm/);
});

test('Family 4 dialogs use accessible shared primitives and OTP handling remains in memory only', () => {
  for (const path of ['features/business-settings/components/UnsavedChangesDialog.tsx', 'features/business-settings/business-hours/components/DateOverrideDeleteDialog.tsx', 'features/service-management/components/ServiceDeleteDialog.tsx', 'features/business-settings/notifications/EmailVerificationDialog.tsx']) {
    const dialog = source(path);
    assert.match(dialog, /useModalFocusTrap/);
    assert.match(dialog, /aria-modal="true"/);
  }
  const otpDialog = source('features/business-settings/notifications/EmailVerificationDialog.tsx');
  assert.match(otpDialog, /event\.key === 'Escape'/);
  assert.match(otpDialog, /autoComplete="one-time-code"/);
  assert.doesNotMatch(otpDialog, /localStorage|sessionStorage|console\.(log|debug)/);
});

test('Family 4 source does not introduce unsafe browser dialogs or sensitive logging', () => {
  const paths = [
    'features/business-settings',
    'features/service-management'
  ];
  for (const path of paths) {
    const entries = path === 'features/business-settings'
      ? ['SettingsPages.tsx', 'Phase4Editors.tsx', 'LegacyBusinessInfoCompatibility.tsx', 'business-hours/BusinessHoursEditor.tsx', 'notifications/NotificationSettingsEditor.tsx', 'notifications/EmailVerificationDialog.tsx', 'line/LineIntegrationEditor.tsx', 'line/LineIntegrationComponents.tsx', 'account/AccountSettingsPage.tsx']
      : ['ServiceManagementPage.tsx', 'ServiceEditorPage.tsx', 'components/ServiceDeleteDialog.tsx'];
    for (const entry of entries) {
      const value = source(`${path}/${entry}`);
      assert.doesNotMatch(value, /window\.(alert|prompt|confirm)|console\.(log|debug)|localStorage|sessionStorage/);
    }
  }
});
