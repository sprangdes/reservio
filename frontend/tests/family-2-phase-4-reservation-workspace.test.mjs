import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function loadModule(relativePath, dependencies = {}) {
  const code = ts.transpileModule(source(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (id) => dependencies[id] ?? (() => { throw new Error(`Unexpected dependency: ${id}`); })();
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const dates = loadModule('features/customer-booking/bookingDates.ts');
const status = loadModule('features/customer-reservations/status.ts');
const normalizers = loadModule('features/customer-reservations/normalizers.ts', { '../customer-booking/bookingDates': dates, './status': status });
const query = loadModule('features/customer-reservations/query.ts', { '../customer-booking/bookingDates': dates });
const capabilities = loadModule('features/customer-reservations/capabilities.ts');

const dto = (id, statusKey, date, startTime) => ({ id, businessId: 8, businessName: '名稱很長的森日髮廊預約店家', title: '名稱很長的女士剪髮與基礎護理服務', reservationDate: date, startTime, endTime: '15:00:00', status: statusKey, username: 'private', userId: 7 });
const summary = (id, statusKey, date, startTime) => normalizers.normalizeReservationSummary(dto(id, statusKey, date, startTime));

test('Phase 4 workspace exposes one customer hierarchy with secondary filters and no legacy table', () => {
  const page = source('pages/MyReservationsPage.tsx');
  const workspace = source('features/customer-reservations/MyReservationsWorkspace.tsx');
  assert.match(page, /MyReservationsWorkspace/);
  assert.match(workspace, /<h1>我的預約<\/h1>/);
  assert.doesNotMatch(workspace, /customer-reservation-workspace__create/);
  assert.match(workspace, /下一個預約/);
  assert.match(workspace, /需要留意/);
  assert.match(workspace, /即將到來/);
  assert.match(workspace, /歷史預約/);
  assert.match(workspace, /ReservationFilters/);
  assert.match(workspace, /CustomerWorkspaceHeader title="我的預約" active="reservations"/);
  assert.doesNotMatch(page, /<table/);
  assert.doesNotMatch(workspace, /\/reservation\/[^n]/);
});

test('customer account and reservation pages share the customer workspace navigation', () => {
  const profile = source('pages/ProfilePage.tsx');
  const dashboard = source('features/customer-dashboard/CustomerDashboardPage.tsx');
  const booking = source('features/customer-booking/BookingFlowPage.tsx');
  const bookingResult = source('features/customer-booking/BookingResultState.tsx');
  const preferences = source('pages/PreferredBusinessesPage.tsx');
  const notifications = source('pages/NotificationsPage.tsx');
  const notificationSettings = source('features/customer-notifications/CustomerNotificationSettingsPage.tsx');
  const header = source('features/customer-workspace/CustomerWorkspaceHeader.tsx');
  const app = source('App.tsx');
  assert.match(profile, /CustomerWorkspaceHeader title="帳號" active="profile"/);
  assert.match(dashboard, /CustomerWorkspaceHeader title="概覽" active="dashboard"/);
  assert.match(booking, /CustomerWorkspaceHeader title="建立預約"/);
  assert.match(bookingResult, /CustomerWorkspaceHeader title="預約已送出"/);
  assert.match(preferences, /CustomerWorkspaceHeader title="想預約店家"/);
  assert.match(notifications, /CustomerWorkspaceHeader title="通知中心" active="notifications"/);
  assert.match(notifications, /to="\/notifications\/settings"/);
  assert.match(notifications, /getReservationStatusPresentation\(status\)\.label/);
  assert.match(notificationSettings, /CustomerWorkspaceHeader title="通知設定" active="notifications"/);
  assert.match(preferences, /customer-preferences-workspace/);
  assert.match(header, /navigate\(-1\)/);
  assert.doesNotMatch(dashboard, /customer-dashboard__topbar/);
  assert.match(header, /to: '\/my\/reservations'/);
  assert.match(header, /to: '\/profile'/);
  assert.match(header, /to: '\/notifications'/);
  assert.match(header, /to="\/reservation\/new"/);
  assert.match(source('styles.css'), /\.customer-workspace-header \{ position: sticky; z-index: 30; top: 0;/);
  assert.match(source('styles.css'), /body:has\(\.customer-dashboard\),/);
  assert.match(source('styles.css'), /body:has\(\.customer-notifications-page\),/);
  assert.match(source('styles.css'), /body:has\(\.customer-notification-settings\),/);
  assert.match(source('styles.css'), /body:has\(\.customer-preferences-workspace\),/);
  assert.match(source('styles.css'), /--system-orange: #dc693d/);
  assert.doesNotMatch(source('styles.css'), /customer-workspace-header nav > a\[aria-current="page"\]/);
  assert.match(source('styles.css'), /customer-notifications-page \{ padding-top: 0; \}/);
  assert.match(app, /path="\/profile"[\s\S]*<RequireAuth><RequireCustomer><ProfilePage \/><\/RequireCustomer><\/RequireAuth>/);
  assert.match(app, /path="\/dashboard"[\s\S]*<RequireAuth><RequireCustomer><CustomerDashboardPage \/><\/RequireCustomer><\/RequireAuth>/);
  assert.match(app, /path="\/preferred-businesses"[\s\S]*<RequireAuth><RequireCustomer><PreferredBusinessesPage \/><\/RequireCustomer><\/RequireAuth>/);
});

test('loaded-page Strategy B grouping chooses only the nearest local future record and retains scheduler-lag status', () => {
  const pending = summary(1, 'PENDING', '2026-08-15', '14:00:00');
  const confirmed = summary(2, 'CONFIRMED', '2026-08-16', '09:00:00');
  const requested = summary(3, 'CANCEL_REQUESTED', '2026-08-17', '10:00:00');
  const completed = summary(4, 'COMPLETED', '2026-08-12', '12:00:00');
  const lagged = summary(5, 'CONFIRMED', '2026-08-14', '09:00:00');
  const cancelled = summary(6, 'CANCELLED', '2026-08-11', '11:00:00');
  const page = { items: [confirmed, requested, completed, pending, lagged, cancelled], page: 2, size: 10, totalPages: 5, totalElements: 44 };
  const sections = query.classifyLoadedReservationPage(page, '2026-08-15', '12:00');
  assert.equal(sections.next.id, '1');
  assert.deepEqual(sections.upcoming.map((item) => item.id), ['2']);
  assert.deepEqual(sections.attention.map((item) => item.id), ['3']);
  assert.deepEqual(sections.history.map((item) => item.id), ['6', '4', '5']);
  assert.equal(sections.history.find((item) => item.id === '5').status, 'CONFIRMED');
  assert.equal(new Set([sections.next.id, ...sections.upcoming.map((item) => item.id), ...sections.attention.map((item) => item.id), ...sections.history.map((item) => item.id)]).size, 6);
});

test('normalization and status presentation expose safe customer fields and all authoritative statuses', () => {
  const record = summary(1, 'PENDING', '2026-08-15', '14:00:00');
  assert.deepEqual(record, { id: '1', businessId: '8', businessName: '名稱很長的森日髮廊預約店家', serviceName: '名稱很長的女士剪髮與基礎護理服務', date: '2026-08-15', startTime: '14:00', endTime: '15:00', status: 'PENDING', remark: null, cancelReason: null });
  for (const [key, label] of Object.entries({ PENDING: '等待店家確認', CONFIRMED: '已確認', CANCEL_REQUESTED: '取消申請處理中', CANCELLED: '已取消', COMPLETED: '已完成' })) assert.equal(status.getReservationStatusPresentation(key).label, label);
  assert.equal(status.normalizeReservationStatus('made-up'), 'UNKNOWN');
  const row = source('features/customer-reservations/ReservationRow.tsx');
  assert.doesNotMatch(row, /reservation\.id|businessId|username|userId/);
  assert.match(source('features/customer-reservations/ReservationStatus.tsx'), /role="status"/);
});

test('reservation normalization keeps records when optional text is serialized as an empty string', () => {
  const record = normalizers.normalizeReservationSummary({ ...dto(9, 'COMPLETED', '2026-08-19', '10:00:00'), remark: '', cancelReason: '   ' });
  assert.equal(record?.id, '9');
  assert.equal(record?.remark, null);
  assert.equal(record?.cancelReason, null);
  assert.equal(normalizers.normalizeReservationSummary({ ...dto(10, 'COMPLETED', '2026-08-19', '10:00:00'), remark: 3 }), null);
});

test('filters preserve supported dependencies and pagination uses the existing authoritative query with request cancellation', () => {
  const filters = source('features/customer-reservations/ReservationFilters.tsx');
  const hook = source('features/customer-reservations/useCustomerReservationsWorkspace.ts');
  assert.match(filters, /aria-expanded/);
  assert.match(filters, /dateFrom/); assert.match(filters, /dateTo/); assert.match(filters, /businessId/); assert.match(filters, /service/); assert.match(filters, /status/); assert.match(filters, /keyword/); assert.match(filters, /sortBy/);
  assert.match(filters, /businessId: event\.target\.value, service: ''/);
  assert.match(hook, /createRequestGuard/);
  assert.match(hook, /customerReservations\(/);
  assert.match(hook, /customerReservedBusinesses\(\{ signal/);
  assert.match(hook, /businessServices\(businessId, \{ signal/);
  assert.match(hook, /setPageIndex\(0\)/);
  assert.match(hook, /isIntentionalAbort/);
  assert.match(source('features/customer-reservations/MyReservationsWorkspace.tsx'), /aria-current="page"/);
});

test('workspace provides honest loading, empty, error and stale states without raw errors', () => {
  const states = source('features/customer-reservations/ReservationWorkspaceStates.tsx');
  const workspace = source('features/customer-reservations/MyReservationsWorkspace.tsx');
  assert.match(states, /正在載入預約資料/);
  assert.match(states, /暫時無法取得預約資料，請稍後再試。/);
  assert.match(states, /目前還沒有預約。/);
  assert.match(states, /目前顯示的是先前載入的資料，部分狀態可能尚未同步。/);
  assert.match(workspace, /hasLoadedPage/);
  assert.doesNotMatch(states, /error\.message/);
});

test('reservation workspace cleanup remains reusable during React Strict Mode remounts', () => {
  const hook = source('features/customer-reservations/useCustomerReservationsWorkspace.ts');
  const guards = source('features/customer-booking/requestGuards.ts');
  assert.match(hook, /businessGuard\.current\.abort\(\)/);
  assert.match(hook, /queryGuard\.current\.abort\(\); serviceGuard\.current\.abort\(\)/);
  assert.doesNotMatch(hook, /\.dispose\(\)/);
  assert.doesNotMatch(guards, /dispose\(\)/);
});

test('Phase 4 cancellation boundary is capability-gated, inert, and contains no mutation or browser confirmation', () => {
  const row = source('features/customer-reservations/ReservationRow.tsx');
  const workspace = source('features/customer-reservations/MyReservationsWorkspace.tsx');
  assert.equal(capabilities.canCancelReservation('PENDING'), true);
  assert.equal(capabilities.canCancelReservation('CONFIRMED'), true);
  assert.equal(capabilities.canCancelReservation('CANCEL_REQUESTED'), false);
  assert.equal(capabilities.canCancelReservation('CANCELLED'), false);
  assert.equal(capabilities.canCancelReservation('COMPLETED'), false);
  assert.match(row, /canCancelReservation/);
  assert.match(row, /disabled/);
  assert.doesNotMatch(row, /cancelReservation|window\.(confirm|alert)/);
  assert.doesNotMatch(workspace, /cancelReservation|window\.(confirm|alert)/);
});

test('responsive and accessibility hooks preserve mobile sections, quiet history, live stale state and touch targets', () => {
  const css = source('styles.css');
  assert.match(css, /customer-reservation-workspace/);
  assert.match(css, /customer-reservation-row\.is-history/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /min-height: 3rem/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(source('features/customer-reservations/ReservationWorkspaceStates.tsx'), /aria-live="polite"/);
});
