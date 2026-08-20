import { normalizeReservationStatus } from '../status';
import type { ReservationApiResponse, ReservationCenterItem, ReservationPageResult } from '../types';

function optionalString(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function availableString(value: unknown) { const resolved = optionalString(value); return resolved ? { value: resolved, availability: 'available' as const } : { availability: 'unsupported' as const }; }
function deriveDuration(start: string | undefined, end: string | undefined) {
  if (!start || !end) return { availability: 'unsupported' as const };
  const toMinutes = (value: string) => { const match = value.match(/^(\d{1,2}):(\d{2})/); return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN; };
  const startMinutes = toMinutes(start); const endMinutes = toMinutes(end);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return { availability: 'unsupported' as const };
  const duration = endMinutes > startMinutes ? endMinutes - startMinutes : endMinutes + 1440 - startMinutes;
  return duration > 0 && duration <= 1440 ? { value: duration, availability: 'derived' as const } : { availability: 'unsupported' as const };
}

export function mapReservationItem(source: unknown): ReservationCenterItem {
  const item = (source && typeof source === 'object' ? source : {}) as Record<string, unknown>;
  const start = optionalString(item.startTime);
  const end = optionalString(item.endTime);
  const cancellationReason = optionalString(item.cancelReason);
  return {
    id: typeof item.id === 'string' || typeof item.id === 'number' ? item.id : '',
    backendStatus: optionalString(item.status) || '',
    status: normalizeReservationStatus(item.status),
    customerName: availableString(item.username), customerPhone: { availability: 'unsupported' }, serviceName: availableString(item.title),
    reservationDate: availableString(item.reservationDate), startTime: start ? { value: start, availability: 'available' } : { availability: 'unsupported' }, endTime: end ? { value: end, availability: 'available' } : { availability: 'unsupported' }, durationMinutes: deriveDuration(start, end),
    remark: availableString(item.remark), createdAt: availableString(item.createdAt), updatedAt: availableString(item.updatedAt), cancellationReason: cancellationReason ? { value: cancellationReason, availability: 'available' } : { availability: 'unsupported' }, rejectionReason: { availability: 'unsupported' }, staffOrResource: { availability: 'unsupported' }, notificationContext: { availability: 'unsupported' }, detailsAvailability: 'partial'
  };
}

export function unwrapReservationResponse(response: unknown): ReservationApiResponse {
  const candidate = response && typeof response === 'object' && 'data' in response ? (response as { data?: unknown }).data : response;
  return candidate && typeof candidate === 'object' ? candidate as ReservationApiResponse : {};
}

export function mapReservationPage(response: unknown, fallbackPage: number, fallbackPageSize: number): ReservationPageResult {
  const page = unwrapReservationResponse(response);
  const rawItems = Array.isArray(page.content) ? page.content : [];
  const currentPage = Number.isInteger(page.number) && Number(page.number) >= 0 ? Number(page.number) : fallbackPage;
  const totalPages = Math.max(0, Number(page.totalPages) || 0);
  const totalCount = Math.max(0, Number(page.totalElements) || 0);
  return { items: rawItems.map(mapReservationItem).filter((item) => item.id !== ''), page: currentPage, pageSize: Number(page.size) || fallbackPageSize, totalPages, totalCount, hasNextPage: totalPages > currentPage + 1 };
}
