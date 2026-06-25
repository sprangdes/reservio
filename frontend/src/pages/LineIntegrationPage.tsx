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

interface LineIntegrationStatus {
  configured: boolean;
  enabled: boolean;
  webhookReady: boolean;
  webhookMessage: string;
  tokenValid: boolean;
  tokenMessage: string;
  richMenuReady: boolean;
  richMenuMessage: string;
  richMenuId: string | null;
  checkedAt: string | null;
}

const emptySettings: LineSettings = {
  configured: false,
  enabled: false,
  channelId: null,
  channelSecretMasked: null,
  accessTokenMasked: null,
  webhookUrl: null
};

const emptyStatus: LineIntegrationStatus = {
  configured: false,
  enabled: false,
  webhookReady: false,
  webhookMessage: '尚未驗證 Webhook URL',
  tokenValid: false,
  tokenMessage: '尚未驗證 Token',
  richMenuReady: false,
  richMenuMessage: '尚未建立 Rich Menu',
  richMenuId: null,
  checkedAt: null
};

export default function LineIntegrationPage() {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [settings, setSettings] = useState<LineSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<'testing' | 'rich-menu' | null>(null);
  const [status, setStatus] = useState<LineIntegrationStatus>(emptyStatus);
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

  const loadStatus = async (configured: boolean) => {
    if (!configured) {
      setStatus(emptyStatus);
      return;
    }
    const response = await api.lineIntegrationStatus();
    setStatus(response?.data || emptyStatus);
  };

  const load = async () => {
    try {
      const response = await api.lineIntegrationSettings();
      const nextSettings = response?.data || emptySettings;
      applySettings(nextSettings);
      await loadStatus(nextSettings.configured);
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
      await loadStatus(response.data.configured);
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
      setStatus((current) => ({ ...current, enabled: false }));
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
      setStatus((current) => ({
        ...current,
        webhookReady: false,
        webhookMessage: 'Webhook URL 已更新，請到 LINE Developers Console 重新設定後再測試'
      }));
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

  const testConnection = async () => {
    try {
      setAction('testing');
      const response = await api.testLineIntegrationConnection();
      setStatus(response.data);
      setSuccessMessage('LINE 連線與 Webhook 檢查完成');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'LINE 連線測試失敗');
    } finally {
      setAction(null);
    }
  };

  const provisionRichMenu = async () => {
    try {
      setAction('rich-menu');
      const response = await api.provisionLineRichMenu();
      setStatus(response.data);
      setSuccessMessage('LINE Rich Menu 已建立或更新');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '建立 LINE Rich Menu 失敗');
    } finally {
      setAction(null);
    }
  };

  const statusItem = (label: string, ready: boolean, message: string) => (
    <div className="col-md-4">
      <div className={`border rounded-3 p-3 h-100 ${ready ? 'border-success' : 'border-secondary-subtle'}`}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <i className={`bi ${ready ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary'}`} />
          <span className="fw-bold">{label}</span>
        </div>
        <div className="small text-muted">{message}</div>
      </div>
    </div>
  );

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

      <div className="card shadow-sm border-0 mt-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h5 className="fw-bold mb-1">串接檢查</h5>
              <p className="text-muted small mb-0">
                儲存憑證後，依序測試連線並建立 Rich Menu。
              </p>
            </div>
            {status.checkedAt ? (
              <span className="text-muted small">
                最後更新：{new Date(status.checkedAt).toLocaleString('zh-TW')}
              </span>
            ) : null}
          </div>

          <div className="row g-3 mb-4">
            {statusItem('Webhook', status.webhookReady, status.webhookMessage)}
            {statusItem('Token validation', status.tokenValid, status.tokenMessage)}
            {statusItem('Rich Menu', status.richMenuReady, status.richMenuMessage)}
          </div>

          <ol className="small text-muted ps-3 mb-4">
            <li>在 LINE Developers Console 建立 Messaging API channel。</li>
            <li>將 Channel ID、Secret、Access Token 儲存於上方表單。</li>
            <li>把 Reservio Webhook URL 貼到 LINE 並啟用 Use webhook。</li>
            <li>執行「測試連線」，成功後建立 Rich Menu。</li>
          </ol>

          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-outline-primary"
              disabled={!settings.configured || action !== null}
              onClick={() => void testConnection()}
            >
              {action === 'testing' ? '測試中…' : '測試連線'}
            </button>
            <button
              className="btn btn-success"
              disabled={!status.tokenValid || action !== null}
              onClick={() => void provisionRichMenu()}
            >
              {action === 'rich-menu'
                ? '建立中…'
                : status.richMenuReady ? '更新 Rich Menu' : '建立 Rich Menu'}
            </button>
          </div>

          <hr className="my-4" />
          <h6 className="fw-bold">Rich Menu 第一版</h6>
          <div className="row g-2 text-center small">
            <div className="col-md-4">
              <div className="rounded bg-success text-white fw-bold p-3">立即預約</div>
            </div>
            <div className="col-md-4">
              <div className="rounded bg-light text-secondary p-3">我的預約（準備中）</div>
            </div>
            <div className="col-md-4">
              <div className="rounded bg-light text-secondary p-3">查詢可預約時段（準備中）</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
