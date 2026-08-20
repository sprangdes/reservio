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

const capabilities = loadModule('features/customer-reservations/capabilities.ts');
const cancellation = loadModule('features/customer-reservations/cancellation.ts', { './capabilities': capabilities });
const reservation = (status) => ({ id: '42', businessId: '8', businessName: '森日髮廊', serviceName: '女士剪髮', date: '2026-08-15', startTime: '14:00', endTime: '15:00', status, remark: null, cancelReason: null });

test('Phase 5 maps PENDING and CONFIRMED cancellation requests exactly and immutably', () => {
  const pending = reservation('PENDING');
  const confirmed = reservation('CONFIRMED');
  assert.deepEqual(cancellation.mapReservationCancellation(pending, 'ignored'), {});
  assert.deepEqual(cancellation.mapReservationCancellation(confirmed, '  臨時有事  '), { cancelReason: '臨時有事' });
  assert.equal(cancellation.mapReservationCancellation(confirmed, '   '), null);
  assert.deepEqual(confirmed, reservation('CONFIRMED'));
  assert.equal(cancellation.cancellationSuccessMessage(pending), '預約已取消。');
  assert.equal(cancellation.cancellationSuccessMessage(confirmed), '取消申請已送出。');
});

test('capability wiring exposes exactly the two cancellable authoritative states', () => {
  assert.equal(capabilities.canCancelReservation('PENDING'), true);
  assert.equal(capabilities.canCancelReservation('CONFIRMED'), true);
  assert.equal(capabilities.canCancelReservation('CANCEL_REQUESTED'), false);
  assert.equal(capabilities.canCancelReservation('CANCELLED'), false);
  assert.equal(capabilities.canCancelReservation('COMPLETED'), false);
  assert.equal(capabilities.requiresCancellationReason('PENDING'), false);
  assert.equal(capabilities.requiresCancellationReason('CONFIRMED'), true);
});

test('shared controller supplies distinct PENDING and CONFIRMED flows with safe validation and one mutation path', () => {
  const overlay = source('features/customer-reservations/CancelReservationOverlay.tsx');
  assert.match(overlay, /取消這筆預約？/);
  assert.match(overlay, /這筆預約尚未由店家確認。取消後將立即標記為已取消。/);
  assert.match(overlay, /送出取消申請？/);
  assert.match(overlay, /此預約已由店家確認。送出後，店家需要處理你的取消申請/);
  assert.match(overlay, /取消原因/);
  assert.match(overlay, /請輸入取消原因。/);
  assert.match(overlay, /api\.cancelReservation\(reservation\.id, payload\)/);
  assert.match(overlay, /if \(pending\) return/);
  assert.match(overlay, /正在取消預約…/);
  assert.match(overlay, /正在送出取消申請…/);
  assert.match(overlay, /暫時無法處理取消操作，請稍後再試。/);
  assert.doesNotMatch(overlay, /window\.(confirm|alert)|localStorage|console\./);
});

test('workspace owns cancellation selection and authoritative refresh without a second query path', () => {
  const workspace = source('features/customer-reservations/MyReservationsWorkspace.tsx');
  const hook = source('features/customer-reservations/useCustomerReservationsWorkspace.ts');
  const row = source('features/customer-reservations/ReservationRow.tsx');
  assert.match(workspace, /CancelReservationOverlay/);
  assert.match(workspace, /onMutationComplete=\{workspace\.refreshAfterCancellation\}/);
  assert.match(row, /onCancel\?\.\(reservation\)/);
  assert.match(hook, /refreshAfterCancellation/);
  assert.match(hook, /await loadReservations\(\)/);
  assert.match(hook, /cancellationBlockedIds/);
  assert.match(hook, /取消操作已送出，但目前無法取得最新預約狀態。/);
  assert.match(hook, /setCancellationBlockedIds\(new Set\(\)\)/);
  assert.doesNotMatch(workspace, /window\.(confirm|alert)/);
});

test('overlay provides dialog and sheet semantics, focus trap, inert background, live feedback and pending close lock', () => {
  const overlay = source('features/customer-reservations/CancelReservationOverlay.tsx');
  const css = source('styles.css');
  assert.match(overlay, /useModalFocusTrap/);
  assert.match(overlay, /role="alertdialog"/);
  assert.match(overlay, /aria-modal="true"/);
  assert.match(overlay, /element\.inert = true/);
  assert.match(overlay, /event\.key === 'Escape' && !pending/);
  assert.match(overlay, /disabled=\{pending\}/);
  assert.match(overlay, /aria-live="polite"/);
  assert.match(overlay, /aria-invalid=\{Boolean\(reasonError\)\}/);
  assert.match(css, /customer-cancellation-layer/);
  assert.match(css, /@media \(max-width: 768px\).*customer-cancellation-layer/s);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /min-height: 3\.2rem/);
});

test('success and refresh-failure focus paths remain honest and never retry the POST', () => {
  const hook = source('features/customer-reservations/useCustomerReservationsWorkspace.ts');
  const overlay = source('features/customer-reservations/CancelReservationOverlay.tsx');
  const mapper = source('features/customer-reservations/cancellation.ts');
  assert.match(mapper, /預約已取消。/);
  assert.match(mapper, /取消申請已送出。/);
  assert.match(hook, /reservation-cancellation-stale/);
  assert.match(hook, /sectionRef\.current\?\.focus\(\)/);
  assert.match(hook, /document\.getElementById\('reservation-cancellation-stale'\)\?\.focus\(\)/);
  assert.equal((overlay.match(/api\.cancelReservation/g) || []).length, 1);
});
