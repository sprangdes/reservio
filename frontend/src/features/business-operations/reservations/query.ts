import type { BackendReservationQuery, QuerySupport, ReservationFilter, ReservationQuery, ReservationSort, ReservationStatusKey, ReservationViewPreset } from './types';

export const reservationQueryFieldSupport: Readonly<Record<'preset' | 'date' | 'dateRange' | 'status' | 'service' | 'keyword' | 'sort' | 'page' | 'pageSize' | 'calendarView' | 'resourceId', QuerySupport>> = {
  preset: 'frontend-derived', date: 'frontend-derived', dateRange: 'backend-supported', status: 'backend-supported', service: 'backend-supported', keyword: 'backend-supported', sort: 'backend-supported', page: 'backend-supported', pageSize: 'backend-supported', calendarView: 'frontend-derived', resourceId: 'future-capability'
};

const pendingStatuses: ReservationStatusKey[] = ['PENDING', 'CANCEL_REQUESTED'];
const backendStatusValues = new Set<ReservationStatusKey>(['PENDING', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'COMPLETED']);
const sortFields = new Set<ReservationSort['field']>(['reservationDate', 'startTime', 'username', 'title', 'remark', 'status', 'businessName']);
const pageSizes = new Set([10, 20, 50]);

export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function defaultReservationFilter(): ReservationFilter { return { dateFrom: '', dateTo: '', statuses: [], service: '', keyword: '' }; }
export function defaultReservationSort(preset: ReservationViewPreset): ReservationSort { return { field: preset === 'today' ? 'startTime' : 'reservationDate', direction: preset === 'today' || preset === 'pending' ? 'asc' : 'desc' }; }
export function defaultReservationQuery(preset: ReservationViewPreset = 'all', now = new Date()): ReservationQuery {
  const filter = defaultReservationFilter();
  if (preset === 'today') filter.dateFrom = filter.dateTo = localDate(now);
  if (preset === 'pending') filter.statuses = [...pendingStatuses];
  return { preset, filter, sort: defaultReservationSort(preset), page: 0, pageSize: 10, calendarView: 'day' };
}

function cleanDate(value: unknown): string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''; }
function sanitizeStatuses(values: unknown): ReservationStatusKey[] { return Array.isArray(values) ? values.filter((value): value is ReservationStatusKey => typeof value === 'string' && backendStatusValues.has(value as ReservationStatusKey)) : []; }
function normalizePreset(value: unknown): ReservationViewPreset { return value === 'today' || value === 'pending' || value === 'calendar' ? value : 'all'; }

export function normalizeReservationQuery(input: Partial<ReservationQuery>, now = new Date()): ReservationQuery {
  const preset = normalizePreset(input.preset);
  const defaults = defaultReservationQuery(preset, now);
  const sourceFilter = input.filter || defaults.filter;
  let dateFrom = cleanDate(sourceFilter.dateFrom);
  let dateTo = cleanDate(sourceFilter.dateTo);
  if (dateFrom && dateTo && dateFrom > dateTo) [dateFrom, dateTo] = [dateTo, dateFrom];
  if (preset === 'today') dateFrom = dateTo = localDate(now);
  const statuses = preset === 'pending' && sanitizeStatuses(sourceFilter.statuses).length === 0 ? [...pendingStatuses] : sanitizeStatuses(sourceFilter.statuses);
  const sort = input.sort && sortFields.has(input.sort.field) ? { field: input.sort.field, direction: input.sort.direction === 'asc' ? 'asc' as const : 'desc' as const } : defaults.sort;
  const requestedSize = Number(input.pageSize);
  return { preset, filter: { dateFrom, dateTo, statuses, service: typeof sourceFilter.service === 'string' ? sourceFilter.service.trim() : '', keyword: typeof sourceFilter.keyword === 'string' ? sourceFilter.keyword.trim() : '' }, sort, page: Math.max(0, Math.floor(Number(input.page) || 0)), pageSize: pageSizes.has(requestedSize) ? requestedSize : defaults.pageSize, calendarView: input.calendarView === 'week' || input.calendarView === 'month' ? input.calendarView : 'day' };
}

export function updateReservationQuery(current: ReservationQuery, patch: Partial<ReservationQuery>, now = new Date()): ReservationQuery {
  const filtersChanged = patch.filter !== undefined || patch.preset !== undefined;
  return normalizeReservationQuery({ ...current, ...patch, page: filtersChanged ? 0 : patch.page ?? current.page }, now);
}

export function toBackendReservationQuery(query: ReservationQuery): BackendReservationQuery {
  const normalized = normalizeReservationQuery(query);
  return { page: normalized.page, size: normalized.pageSize, sortBy: normalized.sort.field, sortDir: normalized.sort.direction, condition: { startDate: normalized.filter.dateFrom || null, endDate: normalized.filter.dateTo || null, service: normalized.filter.service || null, keyword: normalized.filter.keyword || null, status: normalized.filter.statuses.length ? normalized.filter.statuses.join(',') : null } };
}

export function reservationQueryKey(query: ReservationQuery): string {
  const normalized = normalizeReservationQuery({ ...query, page: 0 });
  return JSON.stringify({ preset: normalized.preset, filter: normalized.filter, sort: normalized.sort, pageSize: normalized.pageSize, calendarView: normalized.calendarView });
}

export const reservationShareableUrlFields = ['preset', 'dateFrom', 'dateTo', 'statuses', 'service', 'sort', 'page', 'pageSize', 'calendarView'] as const;
