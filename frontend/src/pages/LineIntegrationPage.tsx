import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

interface LineSettings {
  configured: boolean;
  enabled: boolean;
  channelId: string | null;
  channelSecretMasked: string | null;
  accessTokenMasked: string | null;
  webhookUrl: string | null;
}

const emptySettings: LineSettings = {
  configured: false,
  enabled: false,
  channelId: null,
  channelSecretMasked: null,
  accessTokenMasked: null,
  webhookUrl: null
};

export default function LineIntegrationPage() {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [settings, setSettings] = useState<LineSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channelId: '',
    channelSecret: '',
    accessToken: '',
    enabled: false
  });

  const applySettings = (next: LineSettings) => {
    setSettings(next);
    setForm({
      channelId: next.channelId || '',
      channelSecret: '',
      accessToken: '',
      enabled: next.enabled
    });
  };

  const load = async () => {
    try {
      const response = await api.lineIntegrationSettings();
      applySettings(response?.data || emptySettings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '載入 LINE 串接設定失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const response = await api.saveLineIntegrationSettings({
        channelId: form.channelId.trim(),
        channelSecret: form.channelSecret,
        accessToken: form.accessToken,
        enabled: form.enabled
      });
      applySettings(response.data);
      setSuccessMessage('LINE Messaging API 設定已儲存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '儲存 LINE 串接設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    try {
      const response = await api.disableLineIntegration();
      applySettings(response.data);
      setSuccessMessage('LINE Messaging API 串接已停用');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '停用 LINE 串接失敗');
    }
  };

  const rotateWebhookKey = async () => {
    if (!globalThis.confirm('更新後必須到 LINE Developers Console 換成新的 Webhook URL。確定繼續？')) {
      return;
    }
    try {
      const response = await api.rotateLineWebhookKey();
      applySettings(response.data);
      setSuccessMessage('Webhook URL 已更新');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '更新 Webhook URL 失敗');
    }
  };

  const copyWebhookUrl = async () => {
    if (!settings.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(settings.webhookUrl);
      setSuccessMessage('Webhook URL 已複製');
    } catch {
      setErrorMessage('無法自動複製，請手動選取 Webhook URL');
    }
  };

  if (me?.role !== 'ROLE_BUSINESS') {
    return (
      <main className="container list-page">
        <div className="alert alert-danger">只有商家帳號可以管理 LINE 串接。</div>
      </main>
    );
  }

  if (loading) return null;

  return (
    <main className="container list-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-1">LINE Messaging API 串接</h2>
          <p className="text-muted mb-0">設定商家自己的 LINE 官方帳號憑證與 Webhook URL。</p>
        </div>
        <span className={`badge ${settings.enabled ? 'bg-success' : 'bg-secondary'} fs-6`}>
          {settings.enabled ? '已啟用' : settings.configured ? '已停用' : '尚未設定'}
        </span>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="mb-3">
            <label className="form-label fw-bold" htmlFor="lineChannelId">Channel ID</label>
            <input
              id="lineChannelId"
              className="form-control"
              value={form.channelId}
              onChange={(event) => setForm({ ...form, channelId: event.target.value })}
              placeholder="輸入 Messaging API Channel ID"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" htmlFor="lineChannelSecret">Channel Secret</label>
            <input
              id="lineChannelSecret"
              className="form-control"
              type="password"
              value={form.channelSecret}
              onChange={(event) => setForm({ ...form, channelSecret: event.target.value })}
              placeholder={settings.channelSecretMasked || '輸入 Channel Secret'}
              autoComplete="new-password"
            />
            {settings.configured ? <div className="form-text">留白表示保留目前的 Secret。</div> : null}
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" htmlFor="lineAccessToken">Channel Access Token</label>
            <textarea
              id="lineAccessToken"
              className="form-control"
              rows={3}
              value={form.accessToken}
              onChange={(event) => setForm({ ...form, accessToken: event.target.value })}
              placeholder={settings.accessTokenMasked || '輸入 Channel Access Token'}
            />
            {settings.configured ? <div className="form-text">留白表示保留目前的 Access Token。</div> : null}
          </div>

          <div className="form-check form-switch mb-4">
            <input
              id="lineIntegrationEnabled"
              className="form-check-input"
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
            />
            <label className="form-check-label" htmlFor="lineIntegrationEnabled">啟用 LINE 串接</label>
          </div>

          <button className="btn btn-gradient fw-bold px-4" disabled={saving} onClick={() => void save()}>
            {saving ? '儲存中…' : '儲存設定'}
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h5 className="fw-bold">Webhook URL</h5>
          {settings.webhookUrl ? (
            <>
              <div className="input-group mb-3">
                <input className="form-control font-monospace" value={settings.webhookUrl} readOnly />
                <button className="btn btn-outline-primary" onClick={() => void copyWebhookUrl()}>複製</button>
              </div>
              <p className="text-muted small">
                將此網址填入 LINE Developers Console 的 Messaging API Webhook URL。
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-outline-warning" onClick={() => void rotateWebhookKey()}>
                  更新 Webhook URL
                </button>
                {settings.enabled ? (
                  <button className="btn btn-outline-danger" onClick={() => void disable()}>
                    停用串接
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-muted mb-0">儲存憑證後會產生商家專屬的 Webhook URL。</p>
          )}
        </div>
      </div>
    </main>
  );
}
