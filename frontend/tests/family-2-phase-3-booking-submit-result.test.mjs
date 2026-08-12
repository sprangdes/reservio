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
const api = loadModule('features/customer-booking/bookingApi.ts', { './bookingDates': dates });
const normalizers = loadModule('features/customer-booking/normalizers.ts', { './bookingDates': dates });

const validDraft = Object.freeze({
  business: { id: '12', name: '森日髮廊' },
  service: { id: '32', name: '女士剪髮', durationMinutes: 60 },
  date: '2026-08-15',
  startTime: '14:00',
  estimatedEndTime: '15:00',
  remark: '希望安排較安靜的位置。'
});

test('Phase 3 supplies the review boundary with one progress component and an optional remark', () => {
  const flow = source('features/customer-booking/BookingFlowPage.tsx');
  const review = source('features/customer-booking/BookingReview.tsx');
  assert.match(flow, /BookingReview/);
  assert.match(flow, /BookingSubmitBar/);
  assert.match(flow, /type Step = 1 \| 2 \| 3/);
  assert.match(review, /確認預約/);
  assert.match(review, /備註（選填）/);
  assert.match(review, /送出時會再次確認時段；成功送出後將等待店家確認。/);
  assert.match(source('features/customer-booking/BookingProgress.tsx'), /type BookingProgressProps = Readonly<\{ step: 1 \| 2 \| 3 \}>/);
});

test('submit mapper produces only the exact supported immutable request body', () => {
  const mapped = api.mapBookingCreateRequest(validDraft);
  assert.deepEqual(mapped, { businessId: 12, reservationDate: '2026-08-15', startTime: '14:00', endTime: '15:00', title: '女士剪髮', remark: '希望安排較安靜的位置。' });
  assert.deepEqual(validDraft, { business: { id: '12', name: '森日髮廊' }, service: { id: '32', name: '女士剪髮', durationMinutes: 60 }, date: '2026-08-15', startTime: '14:00', estimatedEndTime: '15:00', remark: '希望安排較安靜的位置。' });
  assert.equal(api.mapBookingCreateRequest({ ...validDraft, startTime: null }), null);
  assert.equal('staff' in mapped, false);
  assert.equal('price' in mapped, false);
  assert.equal('userId' in mapped, false);
});

test('submit flow locks duplicate mutations and handles validation, session, conflict, and server failures safely', () => {
  const flow = source('features/customer-booking/BookingFlowPage.tsx');
  const submitBar = source('features/customer-booking/BookingSubmitBar.tsx');
  assert.match(flow, /submittingRef\.current/);
  assert.match(flow, /if \(submittingRef\.current \|\| !canProceedStepTwo\) return/);
  assert.match(submitBar, /正在送出預約…/);
  assert.match(flow, /error\.status === 400/);
  assert.match(flow, /預約資料有誤，請確認後再試。/);
  assert.match(flow, /isUnauthorizedError\(error\)/);
  assert.match(flow, /error\.status === 409/);
  assert.match(flow, /clearSelectedSlot/);
  assert.match(flow, /refreshSlots/);
  assert.match(flow, /剛才選擇的時段已無法預約，已為你重新整理可用時段。/);
  assert.match(flow, /暫時無法送出預約，請稍後再試。/);
  assert.doesNotMatch(flow, /window\.(alert|confirm)/);
});

test('409 recovery preserves context while clearing only the stale slot', () => {
  const draft = loadModule('features/customer-booking/bookingDraft.ts');
  const cleared = { ...validDraft, startTime: null, estimatedEndTime: null };
  assert.deepEqual({ business: cleared.business, service: cleared.service, date: cleared.date, remark: cleared.remark }, { business: validDraft.business, service: validDraft.service, date: validDraft.date, remark: validDraft.remark });
  assert.equal(cleared.startTime, null);
  assert.equal(cleared.estimatedEndTime, null);
  assert.equal(draft.updateBookingRemark(validDraft, '保留備註').remark, '保留備註');
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /conflictRef\.current\?\.focus\(\)/);
});

test('successful create result is safe, authoritative, PENDING-only and has no ID display', () => {
  const result = normalizers.normalizeBookingCreateResult({ id: 99, businessId: 12, businessName: '森日髮廊', title: '女士剪髮', reservationDate: '2026-08-15', startTime: '14:00:00', endTime: '15:05:00', status: 'PENDING', remark: '希望安排較安靜的位置。', username: 'private' });
  assert.deepEqual(result, { businessName: '森日髮廊', serviceName: '女士剪髮', date: '2026-08-15', startTime: '14:00', endTime: '15:05', status: 'PENDING', remark: '希望安排較安靜的位置。' });
  assert.equal(normalizers.normalizeBookingCreateResult({ businessName: '森日髮廊', title: '女士剪髮', reservationDate: '2026-08-15', startTime: '14:00', endTime: '15:00', status: 'CONFIRMED' }), null);
  const view = source('features/customer-booking/BookingResultState.tsx');
  assert.match(view, /預約已送出/);
  assert.match(view, /已送出，等待店家確認/);
  assert.match(view, /等待店家確認/);
  assert.match(view, /\/my\/reservations/);
  assert.match(view, /navigate\('\/'\)/);
  assert.doesNotMatch(view, /\.id/);
  assert.doesNotMatch(view, /localStorage|sessionStorage/);
});

test('successful create can fill omitted presentation fields from the immutable submitted draft', () => {
  const result = normalizers.normalizeBookingCreateResult({ id: 100, status: 'PENDING' }, validDraft);
  assert.deepEqual(result, { businessName: '森日髮廊', serviceName: '女士剪髮', date: '2026-08-15', startTime: '14:00', endTime: '15:00', status: 'PENDING', remark: '希望安排較安靜的位置。' });
  assert.equal(normalizers.normalizeBookingCreateResult({ status: 'PENDING' }, validDraft), null);
  assert.equal(normalizers.normalizeBookingCreateResult({ id: 100, status: 'CONFIRMED' }, validDraft), null);
  assert.match(source('features/customer-booking/BookingFlowPage.tsx'), /normalizeBookingCreateResult\(responseData\(response\), snapshot\)/);
});

test('review and result expose focus, live feedback, and responsive safe-area hooks', () => {
  const review = source('features/customer-booking/BookingReview.tsx');
  const result = source('features/customer-booking/BookingResultState.tsx');
  const css = source('styles.css');
  assert.match(review, /htmlFor="booking-remark"/);
  assert.match(review, /aria-describedby="booking-submit-note booking-submit-error"/);
  assert.match(review, /role="alert"/);
  assert.match(result, /headingRef\.current\?\.focus\(\)/);
  assert.match(result, /role="status"/);
  assert.match(css, /booking-flow__submit-bar/);
  assert.match(css, /booking-result/);
  assert.match(css, /body:has\(\.booking-result\)/);
  assert.match(css, /safe-area-inset-bottom/);
});
