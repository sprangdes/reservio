import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-operations/', import.meta.url);
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

const query = loadModule('reservations/query.ts');
const status = loadModule('reservations/status.ts');
const mappers = loadModule('reservations/data/reservationMappers.ts', { '../status': status });
const overview = loadModule('overview.ts', { './reservations/status': status, './reservations/query': query });
const page = source('OperationsOverviewPage.tsx');
const hook = source('hooks/useOperationsOverview.ts');
const sections = source('ui/OperationsOverviewSections.tsx');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');

test('business overview uses the existing pending query and derives only reliable totals', () => {
  const pending = overview.createOverviewPendingQuery(new Date('2026-07-24T09:30:00'));
  assert.deepEqual(pending.filter.statuses, ['PENDING', 'CANCEL_REQUESTED']);
  assert.equal(pending.pageSize, 10);
  const summary = overview.todaySummary({ totalCount: 12 }, { totalCount: 3 });
  assert.deepEqual(summary, { todayCount: 12, pendingCount: 3, source: { todayCount: 'backend-total', pendingCount: 'backend-total' } });
});

test('next reservation and agenda use local date/time values and exclude terminal reservations', () => {
  const now = new Date(2026, 6, 24, 10, 15);
  const confirmed = mappers.mapReservationItem({ id: 1, status: 'CONFIRMED', reservationDate: '2026-07-24', startTime: '10:30:00', title: '剪髮' });
  const future = mappers.mapReservationItem({ id: 2, status: 'PENDING', reservationDate: '2026-07-24', startTime: '14:00:00', title: '護理' });
  const cancelled = mappers.mapReservationItem({ id: 3, status: 'CANCELLED', reservationDate: '2026-07-24', startTime: '10:20:00' });
  assert.equal(overview.nextUpcomingReservation([future, cancelled, confirmed], now)?.id, 1);
  assert.deepEqual(overview.todayAgendaPreview([future, confirmed, cancelled], now).map((item) => item.id), [3, 1, 2]);
  assert.equal(overview.isActionableException(mappers.mapReservationItem({ id: 4, status: 'CANCEL_REQUESTED' })), true);
});

test('operations overview keeps business routing isolated, shares controller mutations, and has no invented endpoint', () => {
  assert.match(app, /me\?\.role === 'ROLE_BUSINESS'/);
  assert.match(app, /<Layout><HomePage \/><\/Layout>/);
  assert.match(page, /useReservationCenter\(\{ preset: 'today' \}\)/);
  assert.match(page, /ReservationDetailsExperience/);
  assert.match(page, /todayController\.mutate/);
  assert.match(page, /overview\.refresh\('refresh'\)/);
  assert.match(sections, /view=calendar/);
  assert.match(hook, /Promise\.allSettled/);
  assert.match(hook, /notificationUnreadCount/);
  assert.match(hook, /notifications\(0, 5\)/);
  assert.doesNotMatch(hook, /setInterval|fetch\(|\/api\//);
  assert.match(sections, /getReservationRouteForPreset/);
  assert.match(sections, /resolveReservationActionCapabilities/);
  assert.doesNotMatch(sections, /updateReservationStatus|businessReservations/);
  assert.match(home, /export default function HomePage/);
});
