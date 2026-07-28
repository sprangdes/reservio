import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/service-management/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function load(path) { const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const module = { exports: {} }; Function('exports', 'require', 'module', code)(module.exports, () => ({})); return module.exports; }
const services = load('data/services.ts');

test('service normalization keeps valid server records, isolates malformed records, and preserves server order', () => {
  const sourceItems = [{ id: 2, name: '剪髮', duration: 30, active: true }, { id: 3, name: ' ', duration: 45, active: false }, { id: 4, name: '染髮', duration: 60, active: false }];
  const result = services.normalizeServices(sourceItems);
  assert.deepEqual(result.services, [{ id: '2', name: '剪髮', duration: 30, active: true }, { id: '4', name: '染髮', duration: 60, active: false }]); assert.equal(result.malformed, 1); assert.equal(sourceItems[0].id, 2);
  assert.deepEqual(services.normalizeService({ id: 5, name: '洗髮', duration: 20, active: null }), { id: '5', name: '洗髮', duration: 20, active: false }); assert.equal(services.normalizeService({ id: '', name: '服務', duration: 30, active: true }), undefined); assert.equal(services.normalizeService({ id: 1, name: '服務', duration: 0, active: true }), undefined); assert.equal(services.normalizeService({ id: 1, name: '服務', duration: 30, active: 'true' }), undefined);
});

test('service derivation and supported payload mapping do not invent fields', () => {
  const items = [{ id: '1', name: 'A', duration: 30, active: true }, { id: '2', name: 'B', duration: 60, active: false }];
  assert.deepEqual(services.serviceSummary(items), { total: 2, active: 1, inactive: 1 }); assert.deepEqual(services.servicePayload({ name: '  剪髮  ', duration: '30' }), { name: '剪髮', duration: 30 });
});

test('service form validation rejects whitespace names and non-positive or decimal duration values', () => {
  assert.deepEqual(services.validateServiceForm({ name: '剪髮', duration: '30' }), {}); assert.equal(services.validateServiceForm({ name: '   ', duration: '30' }).name, '請輸入服務名稱'); assert.equal(services.validateServiceForm({ name: '剪髮', duration: '' }).duration, '請輸入服務時長'); assert.equal(services.validateServiceForm({ name: '剪髮', duration: '0' }).duration, '服務時長必須是正整數分鐘'); assert.equal(services.validateServiceForm({ name: '剪髮', duration: '30.5' }).duration, '服務時長必須是正整數分鐘');
});

test('service error mapping distinguishes verified reservation restrictions and preserves actionable fallback', () => {
  assert.equal(services.serviceErrorMessage(new Error('服務項目目前無法編輯'), 'modify'), '此服務已有待處理或已確認的預約，目前無法修改。'); assert.match(services.serviceErrorMessage(new Error('服務項目目前無法編輯'), 'delete'), /你可以先停用服務/); assert.equal(services.serviceErrorMessage(new Error('服務項目不存在'), 'delete'), '找不到這項服務，服務可能已被刪除。');
});

test('canonical list and focused editors use only supported APIs with scoped mutation and accessible deletion', () => {
  const list = source('ServiceManagementPage.tsx'); const editor = source('ServiceEditorPage.tsx'); const dialog = source('components/ServiceDeleteDialog.tsx'); const routes = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'); const legacy = readFileSync(new URL('../src/pages/ServiceManagementPage.tsx', import.meta.url), 'utf8');
  assert.match(list, /api\.businessServices/); assert.match(list, /api\.serviceOn/); assert.match(list, /api\.serviceOff/); assert.match(list, /api\.deleteServiceItem/); assert.match(list, /pending/); assert.match(list, /refreshSettingsOverviewSection\('services'\)/); assert.doesNotMatch(list, /window\.confirm/);
  assert.match(editor, /api\.addServiceItem/); assert.match(editor, /api\.modifyServiceItem/); assert.match(editor, /api\.businessServices/); assert.doesNotMatch(editor, /single-service|api\.service\(/); assert.match(editor, /useDirtyForm/); assert.match(editor, /StickySaveBar/);
  assert.match(dialog, /role="alertdialog"/); assert.match(dialog, /useModalFocusTrap/); assert.match(dialog, /刪除服務？/); assert.match(dialog, /刪除「\{service\.name\}」後將無法復原。/); assert.match(routes, /\/service\/manage/); assert.match(routes, /\/service\/new/); assert.match(routes, /\/service\/:id\/edit/); assert.match(legacy, /features\/service-management\/ServiceManagementPage/);
});
