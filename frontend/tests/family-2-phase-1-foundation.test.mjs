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
const bookingNormalizers = loadModule('features/customer-booking/normalizers.ts', { './bookingDates': dates });
const bookingDraft = loadModule('features/customer-booking/bookingDraft.ts');
const bookingApi = loadModule('features/customer-booking/bookingApi.ts', { './bookingDates': dates });
const requestGuards = loadModule('features/customer-booking/requestGuards.ts');
const status = loadModule('features/customer-reservations/status.ts');
const capabilities = loadModule('features/customer-reservations/capabilities.ts');
const reservationNormalizers = loadModule('features/customer-reservations/normalizers.ts', { '../customer-booking/bookingDates': dates, './status': status });
const reservationQuery = loadModule('features/customer-reservations/query.ts', { '../customer-booking/bookingDates': dates });

test('Family 2 customer routes enforce RequireAuth then RequireCustomer without mounting legacy page redirects', () => {
  const app = source('App.tsx');
  const customerPage = source('pages/MyReservationsPage.tsx');
  assert.match(app, /function RequireCustomer/);
  assert.match(app, /me\?\.role !== 'ROLE_USER'/);
  assert.match(app, /<RequireAuth>\s*<RequireCustomer><ReservationNewPage \/><\/RequireCustomer>/);
  assert.match(app, /<RequireAuth>\s*<RequireCustomer><MyReservationsPage \/><\/RequireCustomer>/);
  assert.match(app, /<PasswordResetGuard>\s*<BusinessSetupGuard>/);
  assert.match(app, /path="\/reservation\/manage"/);
  assert.doesNotMatch(customerPage, /navigate\('\/reservation\/manage'/);
  assert.match(app, /returnTo=\$\{returnTo\}/);
  assert.match(source('components/SessionTimeoutManager.tsx'), /navigate\(`\/login\?returnTo=\$\{returnTo\}`/);
  assert.match(source('api.ts'), /class ApiError/);
  assert.match(source('api.ts'), /new ApiError\(response\.status, message\)/);
});

test('booking normalizers keep only valid safe domain fields and do not mutate DTOs', () => {
  const businessDto = { id: 3, name: '森日髮廊', username: 'private' };
  const serviceDto = { id: 7, name: '女士剪髮', duration: 60, active: true, price: 900 };
  const slots = [{ time: '09:00:00', available: true }, { time: 'wrong', available: true }];
  assert.deepEqual(bookingNormalizers.normalizeBusiness(businessDto), { id: '3', name: '森日髮廊' });
  assert.deepEqual(bookingNormalizers.normalizeService(serviceDto), { id: '7', name: '女士剪髮', durationMinutes: 60, active: true });
  assert.deepEqual(bookingNormalizers.normalizeDisabledDates(['2026-08-15', 'bad']), ['2026-08-15']);
  assert.deepEqual(bookingNormalizers.normalizeSlots(slots), [{ startTime: '09:00', available: true }]);
  assert.equal(bookingNormalizers.normalizeBusiness({ id: 0, name: 'x' }), null);
  assert.equal(bookingNormalizers.normalizeService({ id: 1, name: 'x', duration: 0, active: true }), null);
  assert.equal(bookingNormalizers.normalizeBookingCreateResult({ businessName: 'A', title: 'B', reservationDate: '2026-08-15', startTime: '10:00', endTime: '11:00', status: 'CONFIRMED' }), null);
  assert.deepEqual(businessDto, { id: 3, name: '森日髮廊', username: 'private' });
  assert.deepEqual(serviceDto, { id: 7, name: '女士剪髮', duration: 60, active: true, price: 900 });
});

test('booking draft invalidation preserves only approved context and remark', () => {
  const initial = { business: { id: '1', name: '甲' }, service: { id: '2', name: '剪髮', durationMinutes: 60 }, date: '2026-08-15', startTime: '14:00', estimatedEndTime: '15:00', remark: '安靜位置' };
  const changedBusiness = bookingDraft.selectBookingBusiness(initial, { id: '3', name: '乙' });
  assert.deepEqual(changedBusiness, { business: { id: '3', name: '乙' }, service: null, date: null, startTime: null, estimatedEndTime: null, remark: '安靜位置' });
  const changedService = bookingDraft.selectBookingService(initial, { id: '4', name: '造型', durationMinutes: 90, active: true });
  assert.equal(changedService.date, null);
  assert.equal(changedService.startTime, null);
  assert.equal(changedService.estimatedEndTime, null);
  assert.equal(changedService.remark, '安靜位置');
  const changedDate = bookingDraft.selectBookingDate(initial, '2026-08-16');
  assert.equal(changedDate.business?.id, '1');
  assert.equal(changedDate.service?.id, '2');
  assert.equal(changedDate.startTime, null);
  assert.equal(changedDate.estimatedEndTime, null);
});

test('local dates and schedule times stay calendar-local without UTC date parsing', () => {
  assert.equal(dates.isLocalDate('2026-08-15'), true);
  assert.equal(dates.isLocalDate('2026-02-29'), false);
  assert.equal(dates.formatLocalDateZhTw('2026-08-15'), '2026年8月15日');
  assert.equal(dates.normalizeLocalTime('14:00:30'), '14:00');
  assert.equal(dates.normalizeLocalTime('24:00'), null);
  assert.equal(dates.formatLocalTimeRange('14:00', '15:00:00'), '14:00–15:00');
  assert.equal(dates.addMinutesToTime('23:30', 45), '00:15');
  assert.equal(dates.addLocalMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(dates.toFlatpickrDateValue('2026-08-15'), '2026-08-15');
  assert.doesNotMatch(source('features/customer-booking/bookingDates.ts'), /new Date\("\d{4}-\d{2}-\d{2}"\)/);
  assert.doesNotMatch(source('pages/ReservationNewPage.tsx'), /toISOString\(\)\.split\('T'\)/);
});

test('reservation statuses, capability helpers, normalizers, and loaded-page grouping retain authoritative state', () => {
  const labels = { PENDING: '等待店家確認', CONFIRMED: '已確認', CANCEL_REQUESTED: '取消申請處理中', CANCELLED: '已取消', COMPLETED: '已完成' };
  for (const [key, label] of Object.entries(labels)) assert.equal(status.getReservationStatusPresentation(key).label, label);
  assert.equal(status.normalizeReservationStatus('invalid'), 'UNKNOWN');
  assert.equal(capabilities.canCancelReservation('PENDING'), true);
  assert.equal(capabilities.canCancelReservation('CONFIRMED'), true);
  assert.equal(capabilities.canCancelReservation('CANCEL_REQUESTED'), false);
  assert.equal(capabilities.canCancelReservation('CANCELLED'), false);
  assert.equal(capabilities.canCancelReservation('COMPLETED'), false);
  assert.equal(capabilities.requiresCancellationReason('CONFIRMED'), true);
  assert.equal(capabilities.requiresCancellationReason('PENDING'), false);
  const raw = { id: 9, businessId: 2, businessName: '森日髮廊', title: '剪髮', reservationDate: '2026-08-15', startTime: '14:00:00', endTime: '15:00:00', status: 'PENDING', username: 'private', userId: 6 };
  const item = reservationNormalizers.normalizeReservationSummary(raw);
  assert.deepEqual(item, { id: '9', businessId: '2', businessName: '森日髮廊', serviceName: '剪髮', date: '2026-08-15', startTime: '14:00', endTime: '15:00', status: 'PENDING', remark: null, cancelReason: null });
  assert.deepEqual(raw, { id: 9, businessId: 2, businessName: '森日髮廊', title: '剪髮', reservationDate: '2026-08-15', startTime: '14:00:00', endTime: '15:00:00', status: 'PENDING', username: 'private', userId: 6 });
  const page = { items: [item, { ...item, id: '10', date: '2026-08-14', status: 'CONFIRMED' }, { ...item, id: '11', status: 'COMPLETED' }], page: 0, size: 10, totalPages: 1, totalElements: 3 };
  const sections = reservationQuery.classifyLoadedReservationPage(page, '2026-08-15', '12:00');
  assert.equal(sections.next?.id, '9');
  assert.deepEqual(sections.history.map((entry) => entry.id), ['10', '11']);
});

test('request guards abort superseded work, latest generation wins, and instances are isolated', () => {
  const first = requestGuards.createRequestGuard();
  const second = requestGuards.createRequestGuard();
  const firstRequest = first.begin();
  const latestRequest = first.begin();
  const secondRequest = second.begin();
  assert.equal(firstRequest.signal.aborted, true);
  assert.equal(first.isCurrent(firstRequest), false);
  assert.equal(first.isCurrent(latestRequest), true);
  assert.equal(second.isCurrent(secondRequest), true);
  first.abort();
  assert.equal(latestRequest.signal.aborted, true);
  assert.equal(second.isCurrent(secondRequest), true);
  assert.equal(requestGuards.isIntentionalAbort(new DOMException('aborted', 'AbortError')), true);
});

test('booking request mapper keeps the existing backend shape and rejects incomplete drafts', () => {
  const draft = { business: { id: '12', name: '森日髮廊' }, service: { id: '4', name: '女士剪髮', durationMinutes: 60 }, date: '2026-08-15', startTime: '14:00', estimatedEndTime: '15:00', remark: '安靜位置' };
  assert.deepEqual(bookingApi.mapBookingCreateRequest(draft), { businessId: 12, reservationDate: '2026-08-15', startTime: '14:00', endTime: '15:00', title: '女士剪髮', remark: '安靜位置' });
  assert.equal(bookingApi.mapBookingCreateRequest({ ...draft, startTime: null }), null);
});
