import { useCallback, useMemo, useState } from 'react';
import { applyValidation, cloneSettingsValue, createSettingsFormSnapshot, saveStateFor, settingsValuesEqual } from '../formState';
import { useRegisterDirtyForm } from '../state/SettingsDirtyRegistry';
import type { SettingsFormKey, SettingsValidationResult } from '../types';

type SupportedSettingsValues = null | undefined | string | number | boolean | SupportedSettingsValues[] | { [key: string]: SupportedSettingsValues };
export function useDirtyForm<T extends Record<string, SupportedSettingsValues>>({ key, baseline }: Readonly<{ key: SettingsFormKey; baseline: T }>) {
  const [snapshot, setSnapshot] = useState(() => createSettingsFormSnapshot(baseline));
  const isDirty = !settingsValuesEqual(snapshot.baseline, snapshot.values);
  const discard = useCallback(() => setSnapshot((current) => ({ ...current, values: cloneSettingsValue(current.baseline), fieldErrors: {}, formError: undefined, stale: false, isSubmitting: false, saveState: 'idle' })), []);
  useRegisterDirtyForm(key, isDirty, snapshot.isSubmitting, discard);
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => setSnapshot((current) => { const fieldErrors = { ...current.fieldErrors }; delete (fieldErrors as any)[field]; return { ...current, values: { ...current.values, [field]: value }, fieldErrors, formError: undefined, saveState: 'dirty' }; }), []);
  const replaceValues = useCallback((values: T) => setSnapshot((current) => ({ ...current, values: cloneSettingsValue(values), saveState: 'dirty' })), []);
  const reset = useCallback((nextBaseline: T) => setSnapshot(createSettingsFormSnapshot(nextBaseline)), []);
  const completeSuccess = useCallback((serverValues: T) => setSnapshot(createSettingsFormSnapshot(serverValues)), []);
  const completeFailure = useCallback((message: string) => setSnapshot((current) => ({ ...current, isSubmitting: false, formError: message, saveState: 'error' })), []);
  const beginSubmitting = useCallback(() => setSnapshot((current) => ({ ...current, isSubmitting: true, formError: undefined, saveState: 'submitting' })), []);
  const setValidation = useCallback((result: SettingsValidationResult<T>) => setSnapshot((current) => applyValidation(current, result)), []);
  const markStale = useCallback((stale = true) => setSnapshot((current) => ({ ...current, stale, saveState: stale ? 'stale' : saveStateFor(current, !settingsValuesEqual(current.baseline, current.values)) })), []);
  const refreshFromServer = useCallback((serverValues: T) => { if (!isDirty) reset(serverValues); else markStale(true); }, [isDirty, markStale, reset]);
  return useMemo(() => ({ ...snapshot, isDirty, isValid: !Object.keys(snapshot.fieldErrors).length && !snapshot.formError, setField, replaceValues, reset, discard, beginSubmitting, completeSuccess, completeFailure, setValidation, markStale, refreshFromServer, saveState: saveStateFor(snapshot, isDirty) }), [beginSubmitting, completeFailure, completeSuccess, discard, isDirty, markStale, refreshFromServer, replaceValues, reset, setField, setValidation, snapshot]);
}
