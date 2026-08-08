import { useCallback, useMemo, useState } from 'react';
import { useRegisterDirtyForm } from '../business-settings/state/SettingsDirtyRegistry';
import type { CustomerNotificationFormValue } from './customerNotificationPreferences';

type VisibleCustomerNotificationFields = Pick<
  CustomerNotificationFormValue,
  'emailStatusChanged' | 'emailUpcomingReminder'
>;

type CustomerNotificationFormSnapshot = {
  baseline: VisibleCustomerNotificationFields;
  values: CustomerNotificationFormValue;
  isSubmitting: boolean;
  saveError: string;
  stale: boolean;
};

function visibleFields(value: CustomerNotificationFormValue): VisibleCustomerNotificationFields {
  return {
    emailStatusChanged: value.emailStatusChanged,
    emailUpcomingReminder: value.emailUpcomingReminder
  };
}

function sameVisibleFields(
  left: VisibleCustomerNotificationFields,
  right: VisibleCustomerNotificationFields
): boolean {
  return left.emailStatusChanged === right.emailStatusChanged
    && left.emailUpcomingReminder === right.emailUpcomingReminder;
}

function freshSnapshot(value: CustomerNotificationFormValue): CustomerNotificationFormSnapshot {
  return {
    baseline: visibleFields(value),
    values: { ...value },
    isSubmitting: false,
    saveError: '',
    stale: false
  };
}

/**
 * Customer dirty state deliberately excludes the hidden backend field. The field
 * remains in values solely so the Phase 2 mapper can produce a complete PUT.
 */
export function useCustomerNotificationForm(initialValue: CustomerNotificationFormValue) {
  const [snapshot, setSnapshot] = useState<CustomerNotificationFormSnapshot>(() => freshSnapshot(initialValue));
  const isDirty = !sameVisibleFields(snapshot.baseline, visibleFields(snapshot.values));

  const discard = useCallback(() => {
    setSnapshot((current) => ({
      ...current,
      values: {
        emailStatusChanged: current.baseline.emailStatusChanged,
        emailUpcomingReminder: current.baseline.emailUpcomingReminder,
        preservedEmailNewReservation: current.values.preservedEmailNewReservation
      },
      isSubmitting: false,
      saveError: '',
      stale: false
    }));
  }, []);

  useRegisterDirtyForm('customer-notification-preferences', isDirty, snapshot.isSubmitting, discard);

  const setPreference = useCallback((field: keyof VisibleCustomerNotificationFields, value: boolean) => {
    setSnapshot((current) => ({
      ...current,
      values: { ...current.values, [field]: value },
      saveError: ''
    }));
  }, []);

  const initialize = useCallback((value: CustomerNotificationFormValue) => {
    setSnapshot(freshSnapshot(value));
  }, []);

  const reconcileAuthoritative = useCallback((value: CustomerNotificationFormValue) => {
    setSnapshot((current) => {
      const keepVisibleEdits = !sameVisibleFields(current.baseline, visibleFields(current.values));
      return {
        baseline: visibleFields(value),
        values: keepVisibleEdits
          ? {
            emailStatusChanged: current.values.emailStatusChanged,
            emailUpcomingReminder: current.values.emailUpcomingReminder,
            preservedEmailNewReservation: value.preservedEmailNewReservation
          }
          : { ...value },
        isSubmitting: false,
        saveError: '',
        stale: false
      };
    });
  }, []);

  const beginSave = useCallback(() => {
    setSnapshot((current) => ({ ...current, isSubmitting: true, saveError: '' }));
  }, []);

  const failSave = useCallback((message: string) => {
    setSnapshot((current) => ({ ...current, isSubmitting: false, saveError: message }));
  }, []);

  const markStale = useCallback((message = '') => {
    setSnapshot((current) => ({ ...current, isSubmitting: false, stale: true, saveError: message || current.saveError }));
  }, []);

  return useMemo(() => ({
    ...snapshot,
    isDirty,
    setPreference,
    initialize,
    reconcileAuthoritative,
    discard,
    beginSave,
    failSave,
    markStale
  }), [beginSave, discard, failSave, initialize, isDirty, markStale, reconcileAuthoritative, setPreference, snapshot]);
}
