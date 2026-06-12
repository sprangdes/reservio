import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../state/ToastContext';
import { useAuth } from '../state/AuthContext';

interface Preferences {
  email: string;
  emailVerified: boolean;
  emailNewReservation: boolean;
  emailStatusChanged: boolean;
  emailUpcomingReminder: boolean;
}

interface NotificationSettingsPanelProps {
  onSaved?: () => void;
}

export function NotificationSettingsPanel({ onSaved }: Readonly<NotificationSettingsPanelProps>) {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const { refresh } = useAuth();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const load = async () => {
    const res = await api.notificationPreferences();
    setPreferences(res.data);
    setEmail(res.data?.email || '');
  };

  useEffect(() => {
    void load().catch((err) => setErrorMessage(err instanceof Error ? err.message : '載入設定失敗'));
  }, []);

  const save = async () => {
    if (!preferences) return;
    try {
      const res = await api.updateNotificationPreferences(preferences);
      setPreferences(res.data);
      setSuccessMessage('通知設定已更新');
      onSaved?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '更新設定失敗');
    }
  };

  const requestOtp = async () => {
    try {
      await api.requestEmailVerification({ email });
      setSuccessMessage('驗證碼已寄出');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '寄送驗證碼失敗');
    }
  };

  const verify = async () => {
    try {
      await api.verifyEmail({ otp });
      await load();
      await refresh();
      setOtp('');
      setSuccessMessage('Email 驗證成功');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Email 驗證失敗');
    }
  };

  if (!preferences) return null;
  const toggle = (key: keyof Preferences) => setPreferences({ ...preferences, [key]: !preferences[key] });

  return (
    <div className="settings-panel-section notification-settings-card">
      <div className="notification-settings-card__header">
        <div>
          <h5 className="fw-bold mb-1">Email 通知</h5>
          <p className="text-muted mb-0">驗證 Email 後可接收預約事件提醒。</p>
        </div>
        <span className={`notification-settings-card__status ${preferences.emailVerified ? 'notification-settings-card__status--verified' : 'notification-settings-card__status--pending'}`}>
          {preferences.emailVerified ? 'Email 已驗證' : 'Email 尚未驗證，驗證後才能啟用 Email 通知'}
        </span>
      </div>

      <div className="notification-settings-card__fields">
        <div className="input-group">
          <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-outline-primary" onClick={() => void requestOtp()}>寄送驗證碼</button>
        </div>
        <div className="input-group">
          <input className="form-control" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="輸入驗證碼" />
          <button className="btn btn-outline-success" onClick={() => void verify()}>完成驗證</button>
        </div>
      </div>

      <div className="notification-settings-card__toggles">
        {([
          ['emailNewReservation', '新預約通知'],
          ['emailStatusChanged', '預約狀態變更通知'],
          ['emailUpcomingReminder', '預約前兩小時提醒']
        ] as Array<[keyof Preferences, string]>).map(([key, label]) => (
          <div className="form-check form-switch notification-settings-card__toggle" key={key}>
            <input className="form-check-input" type="checkbox" id={key} checked={Boolean(preferences[key])}
              disabled={!preferences.emailVerified} onChange={() => toggle(key)} />
            <label className="form-check-label" htmlFor={key}>{label}</label>
          </div>
        ))}
      </div>

      <div className="notification-settings-card__actions">
        <button className="btn btn-gradient fw-bold px-4" disabled={!preferences.emailVerified} onClick={() => void save()}>儲存設定</button>
      </div>
    </div>
  );
}

export default function NotificationSettingsPage() {
  return (
    <main className="container list-page">
      <h2 className="fw-bold mb-4">通知設定</h2>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <NotificationSettingsPanel />
        </div>
      </div>
    </main>
  );
}
