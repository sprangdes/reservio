import { validateLocalTime } from '../../validation/settingsValidation';
import type { WeeklyHoursValue } from '../data/businessHoursAdapter';

export type HoursErrors = Record<string, string>;
export function validateHoursRange(startTime: string | null, endTime: string | null): { startTime?: string; endTime?: string } {
  if (!startTime) return { startTime: '請選擇開始時間' };
  if (!endTime) return { endTime: '請選擇結束時間' };
  if (validateLocalTime(startTime)) return { startTime: '請選擇開始時間' };
  if (validateLocalTime(endTime)) return { endTime: '請選擇結束時間' };
  return startTime < endTime ? {} : { endTime: '結束時間必須晚於開始時間' };
}
export function validateWeeklyHours(hours: WeeklyHoursValue): HoursErrors {
  const errors: HoursErrors = {};
  hours.days.forEach((day) => { if (day.inconsistent) { errors[`${day.dayOfWeek}.startTime`] = '請選擇開始時間'; errors[`${day.dayOfWeek}.endTime`] = '請選擇結束時間'; return; } if (day.open) Object.entries(validateHoursRange(day.startTime, day.endTime)).forEach(([key, value]) => { errors[`${day.dayOfWeek}.${key}`] = value; }); });
  return errors;
}
