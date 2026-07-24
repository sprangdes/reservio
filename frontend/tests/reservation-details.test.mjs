import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-operations/reservations/', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

function loadModule(relativePath, dependencies = {}) {
  const code = ts.transpileModule(source(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (id) => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  };
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const status = loadModule('status.ts');
const details = loadModule('details.ts', { './status': status });
const mappers = loadModule('data/reservationMappers.ts', { '../status': status });
const drawer = source('ui/ReservationDetailsDrawer.tsx');
const mobile = source('ui/ReservationDetailsPage.tsx');
const confirmation = source('ui/ReservationActionConfirmation.tsx');
const content = source('ui/ReservationDetailsContent.tsx');
const experience = source('ui/ReservationDetailsExperience.tsx');
const actions = source('ui/ReservationDetailsActions.tsx');

test('details timeline is explicitly compact and only derives supported current-state information', () => {
  const item = mappers.mapReservationItem({ id: 7, status: 'CANCEL_REQUESTED', createdAt: '2026-07-24T09:00:00', updatedAt: '2026-07-24T10:00:00' });
  const timeline = details.createReservationStatusTimeline(item);
  assert.deepEqual(timeline.map((entry) => entry.label), ['已建立預約', '目前：取消申請中']);
  assert.equal(timeline[0].source, 'safely-derived');
  assert.equal(timeline[1].current, true);
  assert.equal(details.reservationMutationLabels.rejectCancellation, '駁回取消申請');
  assert.equal(details.reservationMutationTone('cancel'), 'destructive');
});

test('details UI separates desktop drawer, mobile detail page, and partial-data notice without low-level API calls', () => {
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /event.key === 'Escape'/);
  assert.match(drawer, /openerRef\.current\?\.focus/);
  assert.match(mobile, /reservation-details-page/);
  assert.match(mobile, /返回預約中心/);
  assert.match(content, /目前僅提供清單資料摘要/);
  assert.match(content, /顧客取消原因/);
  assert.match(content, /目前狀態摘要/);
  assert.doesNotMatch(content, /businessReservations|updateReservationStatus|fetch\(/);
});

test('confirmation flow is accessible, prevents duplicate submits, and remains action-capability driven', () => {
  assert.match(confirmation, /role="alertdialog"/);
  assert.match(confirmation, /aria-modal="true"/);
  assert.match(confirmation, /disabled=\{pending\}/);
  assert.match(confirmation, /event.key === 'Escape'/);
  assert.match(actions, /resolveReservationActionCapabilities/);
  assert.match(actions, /reservationMutationTone/);
  assert.doesNotMatch(actions, /updateReservationStatus/);
  assert.match(experience, /history\.pushState/);
  assert.match(experience, /popstate/);
  assert.match(experience, /matchMedia/);
});
