import { isLocalDate, normalizeLocalTime } from '../customer-booking/bookingDates';
import type { ReservationPage, ReservationSummary } from './domain';
import { normalizeReservationStatus } from './status';

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const identifier = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null;
const optionalText = (value: unknown): string | null => value == null || value === '' ? null : text(value);
const isOptionalText = (value: unknown): boolean => value == null || typeof value === 'string';

export function normalizeReservationSummary(value: unknown): ReservationSummary | null {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  const businessName = text(value.businessName);
  const serviceName = text(value.title ?? value.serviceName);
  const date = text(value.reservationDate);
  const startTime = normalizeLocalTime(value.startTime);
  const endTime = normalizeLocalTime(value.endTime);
  const remark = optionalText(value.remark);
  const cancelReason = optionalText(value.cancelReason);
  if (!id || !businessName || !serviceName || !date || !isLocalDate(date) || !startTime || !endTime || !isOptionalText(value.remark) || !isOptionalText(value.cancelReason)) return null;
  return { id, businessId: identifier(value.businessId), businessName, serviceName, date, startTime, endTime, status: normalizeReservationStatus(value.status), remark, cancelReason };
}

export function normalizeReservationPage(value: unknown): ReservationPage | null {
  const source = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(source) || !Array.isArray(source.content)) return null;
  const page = typeof source.number === 'number' && Number.isInteger(source.number) && source.number >= 0 ? source.number : 0;
  const size = typeof source.size === 'number' && Number.isInteger(source.size) && source.size > 0 ? source.size : source.content.length;
  const totalPages = typeof source.totalPages === 'number' && Number.isInteger(source.totalPages) && source.totalPages >= 0 ? source.totalPages : 0;
  const totalElements = typeof source.totalElements === 'number' && Number.isInteger(source.totalElements) && source.totalElements >= 0 ? source.totalElements : source.content.length;
  return { items: source.content.flatMap((item) => { const normalized = normalizeReservationSummary(item); return normalized ? [normalized] : []; }), page, size, totalPages, totalElements };
}
