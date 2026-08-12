import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

function loadModule(relativePath, dependencies = {}) {
  const code = ts.transpileModule(source(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (id) => dependencies[id] ?? (() => { throw new Error(`Unexpected runtime dependency: ${id}`); })();
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const dates = loadModule('features/customer-booking/bookingDates.ts');
const normalizers = loadModule('features/customer-booking/normalizers.ts', { './bookingDates': dates });
const draft = loadModule('features/customer-booking/bookingDraft.ts');
const guards = loadModule('features/customer-booking/requestGuards.ts');

test('Phase 2 uses a route adapter and a focused booking component architecture', () => {
  assert.match(source('pages/ReservationNewPage.tsx'), /BookingFlowPage/);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /BookingProgress/);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /BusinessSelection/);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /ServiceSelection/);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /BookingDatePicker/);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /BookingTimeSlots/);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /BookingContextSummary/);
  assert.match(source('features/customer-booking/BookingProgress.tsx'), /步驟 \{step\} \/ 3/);
  assert.match(source('features/customer-booking/BookingProgress.tsx'), /aria-current/);
  assert.doesNotMatch(source('features/customer-booking/BookingFlowPage.tsx'), /navigate\('\/reservation/);
});

test('business, service, date and slot selection preserve the approved invalidation boundary', () => {
  const initial = { business: { id: '1', name: '甲店' }, service: { id: '2', name: '剪髮', durationMinutes: 60 }, date: '2026-08-15', startTime: '14:00', estimatedEndTime: '15:00', remark: '保留備註' };
  const businessChanged = draft.selectBookingBusiness(initial, { id: '3', name: '乙店' });
  assert.deepEqual(businessChanged, { business: { id: '3', name: '乙店' }, service: null, date: null, startTime: null, estimatedEndTime: null, remark: '保留備註' });
  const serviceChanged = draft.selectBookingService(initial, { id: '4', name: '造型', durationMinutes: 90, active: true });
  assert.equal(serviceChanged.date, null);
  assert.equal(serviceChanged.startTime, null);
  const dateChanged = draft.selectBookingDate(initial, '2026-08-16');
  assert.equal(dateChanged.startTime, null);
  assert.equal(dateChanged.estimatedEndTime, null);
  assert.equal(dates.addMinutesToTime('14:00', 60), '15:00');
});

test('preferred businesses, active services, disabled dates and slots retain only safe normalized values', () => {
  const preferred = [{ id: 1, name: '很長的店家名稱很長的店家名稱', userId: 2 }, { id: 0, name: 'bad' }]
    .map((item) => normalizers.normalizeBusiness(item)).filter(Boolean);
  const services = [{ id: 2, name: '剪髮', duration: 60, active: true }, { id: 3, name: '停用服務', duration: 45, active: false }]
    .map((item) => normalizers.normalizeService(item)).filter((item) => item?.active);
  assert.deepEqual(preferred, [{ id: '1', name: '很長的店家名稱很長的店家名稱' }]);
  assert.deepEqual(services, [{ id: '2', name: '剪髮', durationMinutes: 60, active: true }]);
  assert.deepEqual(normalizers.normalizeDisabledDates(['2026-08-15', 'bad']), ['2026-08-15']);
  assert.deepEqual(normalizers.normalizeSlots([{ time: '09:00', available: true }, { time: '09:30', available: false }]), [{ startTime: '09:00', available: true }, { startTime: '09:30', available: false }]);
});

test('request guards prevent stale services, disabled dates and slots from becoming current', () => {
  const services = guards.createRequestGuard();
  const dates = guards.createRequestGuard();
  const slots = guards.createRequestGuard();
  const oldServices = services.begin(); const newServices = services.begin();
  const oldDates = dates.begin(); const newDates = dates.begin();
  const oldSlots = slots.begin(); const newSlots = slots.begin();
  assert.equal(oldServices.signal.aborted, true); assert.equal(services.isCurrent(oldServices), false); assert.equal(services.isCurrent(newServices), true);
  assert.equal(oldDates.signal.aborted, true); assert.equal(dates.isCurrent(oldDates), false); assert.equal(dates.isCurrent(newDates), true);
  assert.equal(oldSlots.signal.aborted, true); assert.equal(slots.isCurrent(oldSlots), false); assert.equal(slots.isCurrent(newSlots), true);
  assert.equal(guards.isIntentionalAbort(new DOMException('aborted', 'AbortError')), true);
});

test('selection controls expose accessibility and availability semantics without internal IDs', () => {
  const slots = source('features/customer-booking/BookingTimeSlots.tsx');
  const summary = source('features/customer-booking/BookingContextSummary.tsx');
  const picker = source('features/customer-booking/BookingDatePicker.tsx');
  assert.match(slots, /role="radiogroup"/);
  assert.match(slots, /role="radio"/);
  assert.match(slots, /aria-checked/);
  assert.match(slots, /disabled=\{!slot\.available\}/);
  assert.match(slots, /目前不可預約/);
  assert.match(slots, /時段僅代表目前可預約；送出預約時會再次確認。/);
  assert.doesNotMatch(summary, /\.id/);
  assert.match(picker, /toFlatpickrDateValue/);
  assert.match(picker, /fromFlatpickrDateValue/);
  assert.doesNotMatch(picker, /new Date\("\d{4}-\d{2}-\d{2}"\)/);
});

test('responsive booking shell owns its header, desktop summary and touch target hooks', () => {
  const css = source('styles.css');
  assert.match(css, /\.booking-flow__header/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /\.booking-flow__layout \{ display: grid; grid-template-columns: minmax\(0, 1fr\) 21rem/);
  assert.match(css, /min-height: 4\.5rem/);
  assert.match(css, /safe-area-inset-bottom/);
});
