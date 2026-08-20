import { isLocalDate, normalizeLocalTime } from './bookingDates';
import type { BookingBusiness, BookingCreateResult, BookingDraft, BookingService, BookingSlot } from './domain';

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function identifier(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeBusiness(value: unknown): BookingBusiness | null {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  const name = text(value.name);
  return id && name ? { id, name } : null;
}

export function normalizeService(value: unknown): BookingService | null {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  const name = text(value.name);
  const durationMinutes = typeof value.duration === 'number' ? value.duration : value.durationMinutes;
  return id && name && typeof durationMinutes === 'number' && Number.isSafeInteger(durationMinutes) && durationMinutes > 0 && typeof value.active === 'boolean'
    ? { id, name, durationMinutes, active: value.active }
    : null;
}

export function normalizeDisabledDates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isLocalDate);
}

export function normalizeSlots(value: unknown): BookingSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const startTime = normalizeLocalTime(item.time ?? item.startTime);
    return startTime && typeof item.available === 'boolean' ? [{ startTime, available: item.available }] : [];
  });
}

function responseText(value: unknown, fallback: unknown): string | null {
  return value == null ? text(fallback) : text(value);
}

function responseDate(value: unknown, fallback: unknown): string | null {
  const candidate = value == null ? fallback : value;
  return isLocalDate(candidate) ? candidate : null;
}

function responseTime(value: unknown, fallback: unknown): string | null {
  return normalizeLocalTime(value == null ? fallback : value);
}

export function normalizeBookingCreateResult(value: unknown, submitted?: BookingDraft): BookingCreateResult | null {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  const businessName = responseText(value.businessName, submitted?.business?.name);
  const serviceName = responseText(value.title ?? value.serviceName, submitted?.service?.name);
  const date = responseDate(value.reservationDate, submitted?.date);
  const startTime = responseTime(value.startTime, submitted?.startTime);
  const endTime = responseTime(value.endTime, submitted?.estimatedEndTime);
  const responseHasRemark = Object.prototype.hasOwnProperty.call(value, 'remark');
  const remarkSource = responseHasRemark ? value.remark : submitted?.remark;
  const remark = remarkSource == null || remarkSource === '' ? null : text(remarkSource);
  return id && businessName && serviceName && date && startTime && endTime && value.status === 'PENDING' && (remarkSource == null || remarkSource === '' || remark !== null)
    ? { businessName, serviceName, date, startTime, endTime, status: 'PENDING', remark }
    : null;
}
