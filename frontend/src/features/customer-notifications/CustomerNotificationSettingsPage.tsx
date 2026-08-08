import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import SettingsInfrastructure from '../business-settings/SettingsInfrastructure';
import { useToast } from '../../state/ToastContext';
import {
  createCustomerNotificationForm,
  customerNotificationAvailability,
  buildCustomerNotificationPreferencesRequest,
  validateCustomerNotificationPreferences,
  type CustomerNotificationFormValue
} from './customerNotificationPreferences';
import {
  normalizeNotificationPreferencesDomain,
  notificationPreferenceErrorMessage,
  type NotificationPreferencesDomain,
  type NotificationPreferencesNormalizationResult
} from '../notification-preferences/notificationPreferencesDomain';
import {
  CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET,
  customerNotificationSettingsRoute
} from './customerNotificationSettingsRoute';
import { useCustomerNotificationForm } from './useCustomerNotificationForm';

const emptyForm: CustomerNotificationFormValue = {
  emailStatusChanged: false,
  emailUpcomingReminder: false,
  preservedEmailNewReservation: false
};

type LoadedState = Extract<NotificationPreferencesNormalizationResult, { kind: 'valid' | 'missing-email' }>;

const preferences = [
  {
    field: 'emailStatusChanged' as const,
    label: '預約狀態異動',
    description: '商家更新預約狀態時，以 Email 通知你。'
  },
  {
    field: 'emailUpcomingReminder' as const,
    label: '即將到來的預約提醒',
    description: '在已確認的預約即將開始前，以 Email 提醒你。'
  }
];

function loadableResult(result: NotificationPreferencesNormalizationResult): result is LoadedState {
  return result.kind === 'valid' || result.kind === 'missing-email';
}

function CustomerNotificationSettingsContent() {
  const { setSuccessMessage } = useToast();
  const form = useCustomerNotificationForm(emptyForm);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [staleError, setStaleError] = useState('');
  const [saveAnnouncement, setSaveAnnouncement] = useState('');
  const mounted = useRef(true);
  const requestNumber = useRef(0);

  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async (preserveLocalEdits = false) => {
    const requestId = ++requestNumber.current;
    if (!loaded) setInitialLoading(true);
    else setIsRefreshing(true);
    setInitialError('');

    try {
      const response: any = await api.notificationPreferences();
      const normalized = normalizeNotificationPreferencesDomain(response?.data);
      if (!loadableResult(normalized)) {
        throw new Error('通知設定資料不完整，請重新載入後再試。');
      }
      if (!mounted.current || requestId !== requestNumber.current) return false;

      setLoaded(normalized);
      const nextForm = createCustomerNotificationForm(normalized.value);
      if (preserveLocalEdits && form.isDirty) form.reconcileAuthoritative(nextForm);
      else form.initialize(nextForm);
      setStaleError('');
      return true;
    } catch (reason) {
      if (!mounted.current || requestId !== requestNumber.current) return false;
      const message = reason instanceof Error && reason.message === '通知設定資料不完整，請重新載入後再試。'
        ? reason.message
        : notificationPreferenceErrorMessage(reason, 'load');
      if (loaded) {
        setStaleError(message);
        form.markStale();
      } else {
        setInitialError(message);
      }
      return false;
    } finally {
      if (mounted.current && requestId === requestNumber.current) {
        setInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [form, loaded]);

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!loaded || form.isSubmitting || !form.isDirty) return;
    const context = {
      email: loaded.value.email,
      emailVerified: loaded.value.emailVerified,
      dataState: loaded.kind
    } as const;
    const validation = validateCustomerNotificationPreferences(form.values, context);
    if (validation.valid === false) {
      form.failSave(validation.message);
      return;
    }

    form.beginSave();
    setSaveAnnouncement('正在儲存設定');
    try {
      const payload = buildCustomerNotificationPreferencesRequest(form.values, context);
      const response: any = await api.updateNotificationPreferences(payload);
      const normalized = normalizeNotificationPreferencesDomain(response?.data);
      if (normalized.kind !== 'valid') {
        form.markStale('目前顯示的是先前載入的設定，部分狀態可能尚未同步。');
        setStaleError('目前顯示的是先前載入的設定，部分狀態可能尚未同步。');
        setSaveAnnouncement('設定已送出，但目前無法確認最新狀態。');
        return;
      }
      setLoaded(normalized);
      form.initialize(createCustomerNotificationForm(normalized.value));
      setStaleError('');
      setSaveAnnouncement('通知設定已更新。');
      setSuccessMessage('通知設定已更新。');
    } catch (reason) {
      const message = notificationPreferenceErrorMessage(reason, 'save');
      form.failSave(message);
      setSaveAnnouncement(message);
    }
  };

  const retry = () => void load(Boolean(loaded));

  if (initialLoading && !loaded && !initialError) {
    return <CustomerNotificationPageFrame><NotificationSettingsSkeleton /></CustomerNotificationPageFrame>;
  }

  if (!loaded) {
    return <CustomerNotificationPageFrame>
      <NotificationSettingsError message={initialError || '暫時無法取得通知設定，請稍後再試。'} onRetry={retry} />
    </CustomerNotificationPageFrame>;
  }

  const availability = customerNotificationAvailability(loaded);
  const domain = loaded.value;
  const isMissingEmail = availability.state === 'missing-email';
  const isUnverified = availability.state === 'unverified-email';
  const controlsDisabled = !availability.canEditPreferences || form.isSubmitting;

  return <CustomerNotificationPageFrame>
    {staleError || form.stale ? <NotificationSettingsStaleWarning onRetry={retry} refreshing={isRefreshing} /> : null}
    <section className="customer-notification-settings__section" aria-labelledby="customer-notification-email-heading">
      <h2 id="customer-notification-email-heading">Email 通知</h2>
      <NotificationEmailStatus
        domain={domain}
        unverified={isUnverified}
        missingEmail={isMissingEmail}
        verificationMessage={availability.message}
      />
    </section>

    <section className="customer-notification-settings__section" aria-labelledby="customer-notification-preferences-heading">
      <h2 id="customer-notification-preferences-heading">預約通知</h2>
      {isMissingEmail ? <p className="customer-notification-settings__unavailable" role="status">
        <i className="bi bi-envelope-x" aria-hidden="true" />
        需要先設定 Email，才能使用 Email 通知。
      </p> : null}
      <div className="customer-notification-settings__preferences">
        {preferences.map((preference) => <NotificationPreferenceRow
          key={preference.field}
          {...preference}
          checked={isUnverified || isMissingEmail ? false : form.values[preference.field]}
          disabled={controlsDisabled}
          disabledReason={isUnverified ? '需先驗證 Email 才能啟用通知。' : isMissingEmail ? '需先設定 Email 才能使用 Email 通知。' : undefined}
          onChange={(checked) => form.setPreference(preference.field, checked)}
        />)}
      </div>
    </section>

    {form.saveError ? <div className="customer-notification-settings__save-error" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <span>{form.saveError}</span>
    </div> : null}
    <CustomerNotificationStickySave
      visible={form.isDirty}
      saving={form.isSubmitting}
      onDiscard={form.discard}
      onSave={() => void save()}
    />
    <p className="customer-notification-settings__live-region" role="status" aria-live="polite">{saveAnnouncement}</p>
  </CustomerNotificationPageFrame>;
}

function CustomerNotificationPageFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="customer-notification-settings" aria-labelledby="customer-notification-settings-title">
    <div className="customer-notification-settings__content">
      <Link className="customer-notification-settings__back" to={CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET} aria-label="返回個人資料">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        <span>個人資料</span>
      </Link>
      <header className="customer-notification-settings__header">
        <h1 id="customer-notification-settings-title">{customerNotificationSettingsRoute.title}</h1>
        <p>管理目前帳號接收預約相關 Email 通知的方式。</p>
      </header>
      <section className="customer-notification-settings__scope" aria-label="帳號設定範圍說明">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <p>這些設定套用至目前帳號，不會依商家而變。</p>
      </section>
      {children}
    </div>
  </main>;
}

function NotificationEmailStatus({ domain, unverified, missingEmail, verificationMessage }: Readonly<{
  domain: NotificationPreferencesDomain;
  unverified: boolean;
  missingEmail: boolean;
  verificationMessage?: string;
}>) {
  if (missingEmail) {
    return <div className="customer-notification-settings__email-card customer-notification-settings__email-card--missing">
      <div><span className="customer-notification-settings__field-label">目前 Email</span><strong>尚未設定 Email</strong></div>
      <Link className="customer-notification-settings__profile-link" to={CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET}>前往個人資料<i className="bi bi-chevron-right" aria-hidden="true" /></Link>
      <p><i className="bi bi-envelope-x" aria-hidden="true" />需要先設定 Email，才能使用 Email 通知。</p>
    </div>;
  }
  return <div className={`customer-notification-settings__email-card${unverified ? ' customer-notification-settings__email-card--unverified' : ''}`}>
    <div className="customer-notification-settings__email-identity"><span className="customer-notification-settings__field-label">目前 Email</span><strong>{domain.email}</strong></div>
    <div className={`customer-notification-settings__email-status${unverified ? ' is-unverified' : ' is-verified'}`}>
      <i className={`bi ${unverified ? 'bi-exclamation-circle' : 'bi-check-circle-fill'}`} aria-hidden="true" />
      <span>{unverified ? '尚未驗證' : '已驗證'}</span>
    </div>
    {unverified
      ? <button className="customer-notification-settings__verify-button" type="button" aria-describedby="customer-notification-verification-note" onClick={() => undefined}>驗證 Email</button>
      : <Link className="customer-notification-settings__profile-link" to={CUSTOMER_NOTIFICATION_SETTINGS_BACK_TARGET}>變更 Email<i className="bi bi-chevron-right" aria-hidden="true" /></Link>}
    {unverified ? <p id="customer-notification-verification-note">{verificationMessage || '完成 Email 驗證後，才能啟用 Email 通知。'}</p> : null}
  </div>;
}

function NotificationPreferenceRow({ label, description, checked, disabled, disabledReason, onChange }: Readonly<{
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  disabledReason?: string;
  onChange: (checked: boolean) => void;
}>) {
  const id = `customer-notification-${label}`;
  const reasonId = `${id}-reason`;
  return <div className={`customer-notification-settings__preference-row${disabledReason ? ' is-disabled' : ''}`}>
    <div className="customer-notification-settings__preference-copy">
      <label htmlFor={id}>{label}</label>
      <p>{description}</p>
      {disabledReason ? <small id={reasonId}><i className="bi bi-lock" aria-hidden="true" />{disabledReason}</small> : null}
    </div>
    <button
      id={id}
      className="customer-notification-settings__switch"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={disabledReason ? reasonId : undefined}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    ><span aria-hidden="true" /></button>
  </div>;
}

function CustomerNotificationStickySave({ visible, saving, onDiscard, onSave }: Readonly<{
  visible: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}>) {
  if (!visible) return null;
  return <footer className="customer-notification-settings__save-bar" aria-label="通知設定儲存操作">
    <p><i className={`bi ${saving ? 'bi-arrow-repeat' : 'bi-exclamation-circle'}`} aria-hidden="true" />{saving ? '正在儲存設定' : '有尚未儲存的變更'}</p>
    <div>
      <button type="button" disabled={saving} onClick={onDiscard}>捨棄變更</button>
      <button type="button" disabled={saving} onClick={onSave}>{saving ? '儲存中' : '儲存設定'}</button>
    </div>
  </footer>;
}

function NotificationSettingsSkeleton() {
  return <section className="customer-notification-settings__skeleton" aria-busy="true" aria-label="正在載入通知設定">
    <div className="customer-notification-settings__skeleton-section"><span className="customer-notification-settings__skeleton-heading" /><div className="customer-notification-settings__skeleton-card"><span className="customer-notification-settings__skeleton-label" /><span className="customer-notification-settings__skeleton-value" /></div></div>
    <div className="customer-notification-settings__skeleton-section"><span className="customer-notification-settings__skeleton-heading" /><div className="customer-notification-settings__skeleton-card customer-notification-settings__skeleton-card--rows"><span className="customer-notification-settings__skeleton-row" /><span className="customer-notification-settings__skeleton-row" /></div></div>
  </section>;
}

function NotificationSettingsError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return <section className="customer-notification-settings__error" role="alert" aria-live="assertive">
    <i className="bi bi-exclamation-triangle" aria-hidden="true" />
    <div><h2>暫時無法取得通知設定</h2><p>{message}</p></div>
    <button type="button" onClick={onRetry}>重新載入</button>
  </section>;
}

function NotificationSettingsStaleWarning({ onRetry, refreshing }: Readonly<{ onRetry: () => void; refreshing: boolean }>) {
  return <section className="customer-notification-settings__stale" role="status">
    <i className="bi bi-exclamation-circle" aria-hidden="true" />
    <p>目前顯示的是先前載入的設定，部分狀態可能尚未同步。</p>
    <button type="button" disabled={refreshing} onClick={onRetry}>{refreshing ? '重新載入中' : '重新載入'}</button>
  </section>;
}

export default function CustomerNotificationSettingsPage() {
  return <SettingsInfrastructure><CustomerNotificationSettingsContent /></SettingsInfrastructure>;
}
