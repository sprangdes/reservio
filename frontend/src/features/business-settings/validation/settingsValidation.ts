import type { SettingsFieldErrors, SettingsValidationResult } from '../types';

export const requiredString = (value: unknown, message = '此欄位為必填') => typeof value === 'string' && value.length > 0 ? undefined : message;
export const trimmedRequiredString = (value: unknown, message = '此欄位為必填') => typeof value === 'string' && value.trim().length > 0 ? undefined : message;
export const positiveInteger = (value: unknown, message = '請輸入正整數') => typeof value === 'number' && Number.isInteger(value) && value > 0 ? undefined : message;
export function allowedValue<T>(value: T, allowed: readonly T[], message = '請選擇有效項目') { return allowed.includes(value) ? undefined : message; }
export const sixDigitOtp = (value: unknown, message = '請輸入六位數驗證碼') => typeof value === 'string' && /^\d{6}$/.test(value) ? undefined : message;
export const requiredDate = (value: unknown, message = '請選擇日期') => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? undefined : message;
export const conditionalRequired = (condition: boolean, value: unknown, message = '此欄位為必填') => condition ? trimmedRequiredString(value, message) : undefined;

export function validateLocalTime(value: string | null | undefined, message = '請輸入有效時間'): string | undefined { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? undefined : message; }
export function validateRequiredNullableTime(value: string | null | undefined, required: boolean): string | undefined { return required ? validateLocalTime(value) : undefined; }
type TimeRangeFields = { start: string | null | undefined; end: string | null | undefined };
export function validateTimeRange(start: string | null | undefined, end: string | null | undefined, closed = false): SettingsValidationResult<TimeRangeFields> {
  if (closed && start == null && end == null) return { fieldErrors: {} };
  const startError = validateLocalTime(start, '請輸入開始時間'); const endError = validateLocalTime(end, '請輸入結束時間');
  if (startError || endError) return { fieldErrors: { ...(startError ? { start: startError } : {}), ...(endError ? { end: endError } : {}) } };
  return start! < end! ? { fieldErrors: {} } : { fieldErrors: { end: '結束時間必須晚於開始時間' } };
}
export function mergeValidation<T>(...results: Array<SettingsValidationResult<T>>): SettingsValidationResult<T> { return results.reduce((merged, result) => ({ fieldErrors: { ...merged.fieldErrors, ...result.fieldErrors }, formError: result.formError || merged.formError }), { fieldErrors: {} as SettingsFieldErrors<T> }); }
export function firstInvalidField<T>(errors: SettingsFieldErrors<T>, orderedFields: readonly (Extract<keyof T, string>)[]): Extract<keyof T, string> | undefined { return orderedFields.find((field) => Boolean(errors[field])); }
