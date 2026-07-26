import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-settings/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function load(path, dependencies = {}) { const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText; const module = { exports: {} }; const require = (id) => dependencies[id] || {}; Function('exports', 'require', 'module', code)(module.exports, require, module); return module.exports; }
const form = load('formState.ts');
const validation = load('validation/settingsValidation.ts');
const registryModule = load('state/SettingsDirtyRegistry.tsx', { react: { createContext: () => ({}), useCallback: (value) => value, useContext: () => ({}), useEffect: () => {}, useMemo: (value) => value, useRef: (value) => ({ current: value }), useSyncExternalStore: () => ({}) }, 'react/jsx-runtime': {} });
const guard = load('hooks/useUnsavedChangesGuard.tsx', { react: {}, 'react-router-dom': {}, '../components/UnsavedChangesDialog': {}, '../state/SettingsDirtyRegistry': {} });

test('dirty form snapshots compare nested arrays and nullable values without object identity', () => {
  const initial = { name: '商家', hours: [{ start: '09:00', end: null }] };
  const snapshot = form.createSettingsFormSnapshot(initial);
  assert.equal(form.settingsValuesEqual(snapshot.baseline, snapshot.values), true);
  assert.equal(form.settingsValuesEqual(snapshot.baseline, { name: '商家', hours: [{ start: '09:00', end: null }] }), true);
  assert.equal(form.settingsValuesEqual(snapshot.baseline, { name: '新商家', hours: [{ start: '09:00', end: null }] }), false);
  const saved = form.createSettingsFormSnapshot({ name: '已儲存', hours: [] });
  assert.equal(form.saveStateFor(saved, false), 'idle');
  assert.equal(form.saveStateFor({ ...saved, isSubmitting: true }, true), 'submitting');
  assert.equal(form.saveStateFor({ ...saved, formError: '儲存失敗' }, true), 'error');
});

test('form validation, discard, stale, and save state transitions remain explicit', () => {
  let snapshot = form.createSettingsFormSnapshot({ name: '原值' });
  snapshot = form.applyValidation(snapshot, { fieldErrors: { name: '必填' } });
  assert.equal(form.saveStateFor(snapshot, true), 'invalid');
  const discarded = { ...snapshot, values: form.cloneSettingsValue(snapshot.baseline), fieldErrors: {}, formError: undefined, stale: false, isSubmitting: false };
  assert.equal(form.saveStateFor(discarded, false), 'idle');
  assert.equal(form.saveStateFor({ ...discarded, stale: true }, false), 'stale');
});

test('dirty registry tracks multiple independent forms, pending mutations, discard and unregistration', () => {
  const registry = new registryModule.SettingsDirtyRegistry(); let discarded = 0;
  const removeOne = registry.register('profile', { dirty: true, pending: false, discard: () => { discarded += 1; } });
  registry.register('hours', { dirty: false, pending: true, discard: () => { discarded += 1; } });
  assert.deepEqual(registry.snapshot(), { dirty: true, pending: true, count: 2 });
  registry.discardAll(); assert.equal(discarded, 2);
  removeOne(); assert.deepEqual(registry.snapshot(), { dirty: false, pending: true, count: 1 });
  registry.reset(); assert.deepEqual(registry.snapshot(), { dirty: false, pending: false, count: 0 });
});

test('dirty registry returns a stable snapshot until registry metadata changes', () => {
  const registry = new registryModule.SettingsDirtyRegistry(); const initial = registry.snapshot();
  assert.equal(initial, registry.snapshot());
  registry.register('profile', { dirty: true, pending: false, discard: () => {} });
  assert.notEqual(initial, registry.snapshot());
  assert.equal(registry.snapshot(), registry.snapshot());
});

test('validation utilities preserve field order and safe local-time rules', () => {
  assert.equal(validation.requiredString(''), '此欄位為必填'); assert.equal(validation.trimmedRequiredString('  '), '此欄位為必填'); assert.equal(validation.positiveInteger(3), undefined); assert.equal(validation.positiveInteger(0), '請輸入正整數'); assert.equal(validation.allowedValue('a', ['a', 'b']), undefined); assert.equal(validation.sixDigitOtp('123456'), undefined); assert.equal(validation.sixDigitOtp('12345'), '請輸入六位數驗證碼');
  assert.deepEqual(validation.validateTimeRange('09:00', '18:00'), { fieldErrors: {} }); assert.deepEqual(validation.validateTimeRange('09:00', '09:00').fieldErrors, { end: '結束時間必須晚於開始時間' }); assert.deepEqual(validation.validateTimeRange('18:00', '09:00').fieldErrors, { end: '結束時間必須晚於開始時間' }); assert.deepEqual(validation.validateTimeRange('9:00', '18:00').fieldErrors, { start: '請輸入開始時間' }); assert.deepEqual(validation.validateTimeRange(null, '18:00').fieldErrors, { start: '請輸入開始時間' }); assert.deepEqual(validation.validateTimeRange('09:00', null).fieldErrors, { end: '請輸入結束時間' }); assert.deepEqual(validation.validateTimeRange(null, null, true), { fieldErrors: {} });
  assert.equal(validation.firstInvalidField({ phone: '電話格式錯誤', name: '名稱必填' }, ['name', 'phone']), 'name');
});

test('navigation decision blocks pending mutations, confirms dirty forms, and otherwise proceeds', () => {
  assert.equal(guard.navigationDecision({ dirty: false, pending: false }), 'proceed'); assert.equal(guard.navigationDecision({ dirty: true, pending: false }), 'confirm'); assert.equal(guard.navigationDecision({ dirty: true, pending: true }), 'block');
});

test('settings guard remains compatible with the existing BrowserRouter shell', () => {
  const guardSource = source('hooks/useUnsavedChangesGuard.tsx');
  assert.doesNotMatch(guardSource, /useBlocker/);
  assert.match(guardSource, /document\.addEventListener\('click', onClick, true\)/);
  assert.match(guardSource, /beforeunload/);
});

test('shared settings UI exposes accessible error, dialog, unavailable, and sticky-save semantics', () => {
  const components = source('components/UnsavedChangesDialog.tsx'); const saveBar = source('components/StickySaveBar.tsx'); const field = source('components/SettingsField.tsx'); const states = source('components/SettingsStates.tsx');
  assert.match(components, /role="alertdialog"/); assert.match(components, /useModalFocusTrap/); assert.match(components, /尚未儲存變更/); assert.match(saveBar, /請修正錯誤欄位後即可儲存/); assert.match(field, /aria-describedby/); assert.match(states, /尚未提供/); assert.match(states, /role={stale \? 'status' : 'alert'}/);
});
