import type { SettingsFieldErrors, SettingsFormSnapshot, SettingsSaveState, SettingsValidationResult } from './types';

type PlainValue = null | undefined | string | number | boolean | PlainValue[] | { [key: string]: PlainValue };

export function cloneSettingsValue<T extends PlainValue>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => cloneSettingsValue(entry)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneSettingsValue(entry)])) as T;
  return value;
}

/** Supports only null, undefined, primitive values, arrays, and plain object records; not class instances, functions, Maps, Sets, DOM nodes, or cyclic values. */
export function settingsValuesEqual(left: PlainValue, right: PlainValue): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => settingsValuesEqual(value, right[index]));
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && settingsValuesEqual(left[key], right[key]));
}

export function saveStateFor<T>(snapshot: SettingsFormSnapshot<T>, isDirty: boolean): SettingsSaveState {
  if (snapshot.isSubmitting) return 'submitting';
  if (snapshot.stale) return 'stale';
  if (snapshot.formError) return 'error';
  if (Object.keys(snapshot.fieldErrors).length) return 'invalid';
  if (isDirty) return 'dirty';
  return 'idle';
}

export function createSettingsFormSnapshot<T extends PlainValue>(baseline: T): SettingsFormSnapshot<T> {
  const initial = cloneSettingsValue(baseline);
  return { baseline: initial, values: cloneSettingsValue(initial), saveState: 'idle', fieldErrors: {}, stale: false, isSubmitting: false };
}

export function applyValidation<T>(snapshot: SettingsFormSnapshot<T>, result: SettingsValidationResult<T>): SettingsFormSnapshot<T> { return { ...snapshot, fieldErrors: result.fieldErrors, formError: result.formError, saveState: Object.keys(result.fieldErrors).length || result.formError ? 'invalid' : snapshot.saveState }; }
