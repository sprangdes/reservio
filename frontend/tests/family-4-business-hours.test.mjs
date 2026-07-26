import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-settings/business-hours/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function load(path, dependencies = {}) { const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; const module = { exports: {} }; Function('exports', 'require', 'module', code)(module.exports, (id) => dependencies[id] || {}); return module.exports; }
const adapter = load('data/businessHoursAdapter.ts');
const validation = load('validation/businessHoursValidation.ts', { '../../validation/settingsValidation': { validateLocalTime: (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? undefined : 'invalid' } });

test('weekly day mapping is centralized, ordered Monday through Sunday, and safely normalizes omissions', () => {
  assert.deepEqual(adapter.WEEKDAYS.map((day) => day.key), ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
  const weekly = adapter.normalizeWeeklyHours({ defaultWeekSlots: [{ dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00' }, { dayOfWeek: 'TUESDAY', startTime: null, endTime: null }] });
  assert.equal(weekly.days[0].open, true); assert.equal(weekly.days[0].startTime, '09:00'); assert.equal(weekly.days[1].open, false); assert.equal(weekly.days[6].open, false);
  const inconsistent = adapter.normalizeWeeklyHours({ defaultWeekSlots: [{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: null }] });
  assert.equal(inconsistent.days[0].inconsistent, true);
});

test('default-slot aggregate requests preserve the authoritative interval and serialize closed days with null times', () => {
  const weekly = adapter.normalizeWeeklyHours({ defaultWeekSlots: [{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '18:00' }] });
  const request = adapter.defaultSlotRequest(weekly, 30);
  assert.equal(request.defaultInterval, 30); assert.equal(request.defaultWeekSlots.length, 7); assert.deepEqual(request.defaultWeekSlots[1], { dayOfWeek: 'TUESDAY', startTime: null, endTime: null });
  const intervalSave = adapter.intervalDefaultSlotRequest({ defaultInterval: 30, defaultWeekSlots: request.defaultWeekSlots }, 45);
  assert.equal(intervalSave.defaultInterval, 45); assert.deepEqual(intervalSave.defaultWeekSlots[0], request.defaultWeekSlots[0]);
  assert.throws(() => adapter.defaultSlotRequest({ days: [] }, 30));
});

test('weekly and override validation use required, ordered, non-overnight local-time rules', () => {
  assert.deepEqual(validation.validateHoursRange(null, '18:00'), { startTime: '請選擇開始時間' });
  assert.deepEqual(validation.validateHoursRange('09:00', null), { endTime: '請選擇結束時間' });
  assert.deepEqual(validation.validateHoursRange('18:00', '09:00'), { endTime: '結束時間必須晚於開始時間' });
  assert.deepEqual(validation.validateHoursRange('09:00', '18:00'), {});
  const errors = validation.validateWeeklyHours({ days: [{ dayOfWeek: 'MONDAY', open: false, startTime: null, endTime: null }, { dayOfWeek: 'TUESDAY', open: true, startTime: '09:00', endTime: '09:00' }] });
  assert.deepEqual(errors, { 'TUESDAY.endTime': '結束時間必須晚於開始時間' });
});

test('override status is derived from explicit overrides and dates remain API-safe and date-sorted', () => {
  assert.equal(adapter.deriveOverrideStatus(undefined), 'inherited'); assert.equal(adapter.deriveOverrideStatus({ date: '2026-07-28', open: true, startTime: '09:00', endTime: '18:00' }), 'special-hours'); assert.equal(adapter.deriveOverrideStatus({ date: '2026-07-28', open: false, startTime: null, endTime: null }), 'special-closure');
  assert.deepEqual(adapter.sortOverrides([{ date: '2026-08-02', open: false, startTime: null, endTime: null }, { date: '2026-07-28', open: true, startTime: '09:00', endTime: '18:00' }]).map((item) => item.date), ['2026-07-28', '2026-08-02']);
  assert.equal(adapter.isValidApiDate('2026-02-29'), false); assert.equal(adapter.isValidApiDate('2028-02-29'), true);
});

test('hours page keeps weekly and date overrides as separate dirty forms and accessible destructive confirmation', () => {
  const page = source('BusinessHoursEditor.tsx'); const dialog = source('components/DateOverrideDeleteDialog.tsx');
  assert.match(page, /key: 'business-hours-weekly'/); assert.match(page, /key: 'business-hours-override'/); assert.match(page, /api\.setDefaultSlots/); assert.match(page, /api\.adjustDateSlot/); assert.match(page, /api\.deleteDateSlot/); assert.match(page, /refreshSettingsOverviewSection\('slots'\)/); assert.match(page, /flatpickr/);
  assert.match(dialog, /role="alertdialog"/); assert.match(dialog, /useModalFocusTrap/); assert.match(dialog, /刪除指定日期設定？/); assert.match(dialog, /刪除後，這一天將恢復使用每週營業時間。/);
});
