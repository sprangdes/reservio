import { isLocalDate, normalizeLocalTime } from './bookingDates';
import type { BookingBusiness, BookingCreateResult, BookingService, BookingSlot } from './domain';

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

export function normalizeBookingCreateResult(value: unknown): BookingCreateResult | null {
  if (!isRecord(value)) return null;
  const businessName = text(value.businessName);
  const serviceName = text(value.title ?? value.serviceName);
  const date = text(value.reservationDate);
  const startTime = normalizeLocalTime(value.startTime);
  const endTime = normalizeLocalTime(value.endTime);
  const remark = value.remark == null || value.remark === '' ? null : text(value.remark);
  return businessName && serviceName && date && isLocalDate(date) && startTime && endTime && value.status === 'PENDING' && (value.remark == null || remark !== null)
    ? { businessName, serviceName, date, startTime, endTime, status: 'PENDING', remark }
    : null;
}
