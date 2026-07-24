import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-operations/reservations/', import.meta.url);

function loadModule(relativePath, dependencies = {}) {
  const source = readFileSync(new URL(relativePath, root), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (id) => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  };
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const status = loadModule('status.ts');
const query = loadModule('query.ts');
const capabilities = loadModule('capabilities.ts', { './status': status });
const mappers = loadModule('data/reservationMappers.ts', { '../status': status });
const pagination = loadModule('pagination.ts');
const selection = loadModule('selection.ts');
const mutationState = loadModule('mutationState.ts');
const routePresets = loadModule('routePresets.ts');
const adapterModule = loadModule('data/reservationCenterAdapter.ts', {
  '../../../../api': { api: {} },
  '../query': query,
  './reservationMappers': mappers
});

test('normalizes all backend reservation statuses and marks rejected as future only', () => {
  assert.equal(status.normalizeReservationStatus('pending'), 'PENDING');
  assert.equal(status.normalizeReservationStatus('CANCEL_REQUESTED'), 'CANCEL_REQUESTED');
  assert.equal(status.normalizeReservationStatus('REJECTED'), 'UNKNOWN');
  assert.equal(status.getReservationStatusPresentation('COMPLETED').label, '已完成');
  assert.equal(status.reservationStatusPresentations.REJECTED.source, 'future');
  assert.equal(status.reservationStatusPresentations.CANCELLED.terminal, true);
});

test('resolves only backend-supported actions for the normalized status', () => {
  const pending = mappers.mapReservationItem({ id: 1, status: 'PENDING' });
  const pendingCapabilities = capabilities.resolveReservationActionCapabilities(pending);
  assert.equal(pendingCapabilities.confirm.availability, 'available');
  assert.equal(pendingCapabilities.cancel.availability, 'available');
  assert.equal(pendingCapabilities.rejectCancellation.availability, 'disabled');
  const cancellationRequest = mappers.mapReservationItem({ id: 2, status: 'CANCEL_REQUESTED', cancelReason: '臨時有事' });
  const cancellationCapabilities = capabilities.resolveReservationActionCapabilities(cancellationRequest, true);
  assert.equal(cancellationCapabilities.approveCancellation.availability, 'available');
  assert.equal(cancellationCapabilities.rejectCancellation.availability, 'available');
  assert.equal(cancellationCapabilities.inspectCancellationReason.availability, 'available');
  assert.equal(cancellationCapabilities.retryMutation.availability, 'available');
  assert.equal(capabilities.resolveReservationActionCapabilities(mappers.mapReservationItem({ id: 3, status: 'COMPLETED' })).cancel.availability, 'disabled');
});

test('maps legacy routes to one typed preset contract', () => {
  assert.equal(routePresets.getReservationPresetForPath('/reservation/today/manage'), 'today');
  assert.equal(routePresets.getReservationPresetForPath('/reservation/pending/manage'), 'pending');
  assert.equal(routePresets.getReservationPresetForPath('/reservation/manage'), 'all');
  assert.equal(routePresets.getReservationPresetForPath('/unknown'), 'all');
  assert.equal(routePresets.isCanonicalReservationRoute('/reservation/manage'), true);
});

test('normalizes query defaults, date ranges, preset filters, and unsupported values', () => {
  const all = query.defaultReservationQuery('all', new Date('2026-07-24T12:00:00'));
  assert.equal(all.sort.field, 'reservationDate');
  const today = query.normalizeReservationQuery({ preset: 'today', filter: { ...query.defaultReservationFilter(), dateFrom: '2020-01-01', dateTo: '2020-01-02' } }, new Date('2026-07-24T12:00:00'));
  assert.equal(today.filter.dateFrom, '2026-07-24');
  assert.equal(today.filter.dateTo, '2026-07-24');
  const pending = query.normalizeReservationQuery({ preset: 'pending', filter: query.defaultReservationFilter(), page: -4, pageSize: 999 });
  assert.deepEqual(pending.filter.statuses, ['PENDING', 'CANCEL_REQUESTED']);
  assert.equal(pending.page, 0);
  assert.equal(pending.pageSize, 10);
  const range = query.normalizeReservationQuery({ filter: { ...query.defaultReservationFilter(), dateFrom: '2026-07-30', dateTo: '2026-07-01', statuses: ['PENDING', 'REJECTED'] } });
  assert.equal(range.filter.dateFrom, '2026-07-01');
  assert.equal(range.filter.dateTo, '2026-07-30');
  assert.deepEqual(range.filter.statuses, ['PENDING']);
  const changed = query.updateReservationQuery({ ...all, page: 3 }, { filter: { ...all.filter, service: '剪髮' } });
  assert.equal(changed.page, 0);
  assert.equal(query.updateReservationQuery({ ...all, page: 3 }, { sort: { field: 'username', direction: 'asc' } }).page, 0);
  const backend = query.toBackendReservationQuery({ ...pending, filter: { ...pending.filter, resourceId: 'not-supported' } });
  assert.deepEqual(backend.condition, { startDate: null, endDate: null, service: null, keyword: null, status: 'PENDING,CANCEL_REQUESTED' });
});

test('maps API response without inventing unavailable fields and derives duration', () => {
  const item = mappers.mapReservationItem({ id: 10, username: '王小明', title: '剪髮', reservationDate: '2026-07-24', startTime: '23:30:00', endTime: '00:15:00', status: 'CONFIRMED', remark: '', cancelReason: '' });
  assert.equal(item.durationMinutes.value, 45);
  assert.equal(item.durationMinutes.availability, 'derived');
  assert.equal(item.customerPhone.availability, 'unsupported');
  assert.equal(item.staffOrResource.availability, 'unsupported');
  assert.equal(item.detailsAvailability, 'partial');
  const page = mappers.mapReservationPage({ data: { content: [{ id: 10, status: 'PENDING' }], totalPages: 2, totalElements: 11, number: 0, size: 10 } }, 3, 20);
  assert.equal(page.items.length, 1);
  assert.equal(page.hasNextPage, true);
  assert.equal(page.totalCount, 11);
});

test('adapter preserves the existing request contract and backend mutation names', async () => {
  const calls = [];
  const adapter = adapterModule.createReservationCenterAdapter({
    businessReservations: async (params, condition) => {
      calls.push({ params, condition });
      return { data: { content: [{ id: 4, status: 'PENDING' }], totalPages: 1, totalElements: 1, number: 0, size: 10 } };
    },
    updateReservationStatus: async (id, payload) => {
      calls.push({ id, payload });
      return { message: 'updated' };
    }
  });
  const page = await adapter.query(query.defaultReservationQuery('pending'));
  assert.equal(page.items[0].status, 'PENDING');
  assert.deepEqual(calls[0].params, { page: 0, size: 10, sortBy: 'reservationDate', sortDir: 'asc' });
  assert.equal(calls[0].condition.status, 'PENDING,CANCEL_REQUESTED');
  await adapter.mutate(4, 'rejectCancellation');
  assert.deepEqual(calls[1], { id: 4, payload: { action: 'rejectCancel' } });
  assert.throws(() => adapter.mutate(4, 'retryMutation'), /目前不支援/);
});

test('desktop pagination and mobile load-more preserve backend pages without duplicate records', () => {
  const first = { items: [mappers.mapReservationItem({ id: 1, status: 'PENDING' }), mappers.mapReservationItem({ id: 2, status: 'CONFIRMED' })], page: 0, pageSize: 10, totalPages: 2, totalCount: 3, hasNextPage: true };
  const second = { items: [mappers.mapReservationItem({ id: 2, status: 'CONFIRMED' }), mappers.mapReservationItem({ id: 3, status: 'COMPLETED' })], page: 1, pageSize: 10, totalPages: 2, totalCount: 3, hasNextPage: false };
  assert.deepEqual(pagination.getReservationPaginationState(first), { page: 0, totalPages: 2, totalCount: 3, pageSize: 10, hasPreviousPage: false, hasNextPage: true });
  const firstMobile = pagination.appendReservationPage(pagination.createMobileReservationPageState('query-a'), first, 'query-a');
  const secondMobile = pagination.appendReservationPage(firstMobile, second, 'query-a');
  assert.deepEqual(secondMobile.items.map((item) => item.id), [1, 2, 3]);
  const reset = pagination.appendReservationPage(secondMobile, first, 'query-b');
  assert.deepEqual(reset.items.map((item) => item.id), [1, 2]);
  assert.equal(pagination.setMobileLoadMoreError(secondMobile, new Error('failure')).error?.message, 'failure');
});

test('selection reconciliation and mutation states retain only list-derived detail data', () => {
  const original = mappers.mapReservationItem({ id: 8, status: 'PENDING' });
  const selected = selection.selectReservation(original);
  assert.equal(selected?.availability, 'partial');
  const updated = mappers.mapReservationItem({ id: 8, status: 'CONFIRMED' });
  assert.equal(selection.reconcileReservationSelection(selected, [updated])?.item.status, 'CONFIRMED');
  const pending = mutationState.reservationMutationPending(8, 'confirm');
  const success = mutationState.reservationMutationSuccess(8, 'confirm');
  assert.equal(pending.phase, 'pending');
  assert.equal(mutationState.reservationMutationStale(success).phase, 'stale');
  assert.equal(mutationState.reservationMutationError(8, 'confirm', new Error('network')).error?.message, 'network');
});
