import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useToast } from '../../../state/ToastContext';
import { canProvisionRichMenu, canTestLineConnection, createLineCredentialForm, lineSafeErrorMessage, mapLineCredentialUpdate, normalizeBusinessLineIntegrationHealth, normalizeBusinessLineIntegrationSettings, type BusinessLineIntegrationHealth, type BusinessLineIntegrationSettings, type LineCredentialForm } from '../../line/lineDomain';
import SettingsPageHeader from '../components/SettingsPageHeader';
import { SettingsSectionError } from '../components/SettingsStates';
import StickySaveBar from '../components/StickySaveBar';
import { useDirtyForm } from '../hooks/useDirtyForm';
import { refreshSettingsOverviewSection } from '../hooks/useSettingsOverview';
import { BusinessLineConfigurationSummary, LineCredentialEditor, LineHealthList, LineIntegrationDangerZone, LineIntegrationOperations, LineIntegrationSkeleton, LineWebhookSettings } from './LineIntegrationComponents';

type EditorForm = LineCredentialForm & { enabled: boolean };
const emptyForm: EditorForm = { channelId: '', channelSecret: '', channelAccessToken: '', enabled: false };

function unavailableHealth(settings: BusinessLineIntegrationSettings): BusinessLineIntegrationHealth {
  const unavailable = { kind: 'unavailable' as const, message: '完成並啟用設定後即可檢查。', checkedAt: null };
  return { configured: settings.configured, enabled: settings.enabled, lastCheckedAt: null, webhook: unavailable, accessToken: unavailable, richMenu: unavailable };
}

export default function LineIntegrationEditor() {
  const { setSuccessMessage } = useToast();
  const form = useDirtyForm<EditorForm>({ key: 'merchant-line-integration', baseline: emptyForm });
  const [settings, setSettings] = useState<BusinessLineIntegrationSettings | null>(null);
  const [health, setHealth] = useState<BusinessLineIntegrationHealth | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState<'test' | 'rich' | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async (preserveEdits = false) => {
    setError('');
    try {
      const settingsResponse = await api.lineIntegrationSettings();
      const nextSettings = normalizeBusinessLineIntegrationSettings(settingsResponse.data);
      if (!nextSettings) throw new Error('malformed data');
      const nextHealth = nextSettings.configured
        ? normalizeBusinessLineIntegrationHealth((await api.lineIntegrationStatus()).data)
        : unavailableHealth(nextSettings);
      if (!nextHealth || nextHealth.configured !== nextSettings.configured || nextHealth.enabled !== nextSettings.enabled) throw new Error('malformed data');
      setSettings(nextSettings);
      setHealth(nextHealth);
      if (!preserveEdits || !form.isDirty) form.reset({ ...createLineCredentialForm(nextSettings), enabled: nextSettings.enabled });
      else form.markStale(true);
      setStale(false);
      return true;
    } catch (reason) {
      setError(lineSafeErrorMessage(reason));
      if (settings) { setStale(true); form.markStale(true); }
      return false;
    } finally { setInitialLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!settings || form.isSubmitting) return;
    try {
      form.beginSubmitting();
      const request = mapLineCredentialUpdate(form.values, settings, form.values.enabled);
      const response = await api.saveLineIntegrationSettings(request);
      const nextSettings = normalizeBusinessLineIntegrationSettings(response.data);
      if (!nextSettings) throw new Error('malformed data');
      setSettings(nextSettings);
      refreshSettingsOverviewSection('lineSettings');
      if (!await load(false)) { form.markStale(true); return; }
      setSuccessMessage('LINE 整合設定已儲存');
    } catch (reason) { form.completeFailure(lineSafeErrorMessage(reason)); }
  };

  const runOperation = async (kind: 'test' | 'rich') => {
    if (!settings || pending) return;
    try {
      setPending(kind);
      const response = kind === 'test' ? await api.testLineIntegrationConnection() : await api.provisionLineRichMenu();
      const nextHealth = normalizeBusinessLineIntegrationHealth(response.data);
      if (!nextHealth || nextHealth.configured !== settings.configured || nextHealth.enabled !== settings.enabled) throw new Error('malformed data');
      setHealth(nextHealth);
      setStale(false);
      setSuccessMessage(kind === 'test' ? 'LINE 連線測試完成' : 'LINE Rich Menu 已建立或更新');
    } catch (reason) { setError(lineSafeErrorMessage(reason)); } finally { setPending(null); }
  };

  const copyWebhook = async () => {
    if (!settings?.webhookUrl) return;
    try { await navigator.clipboard.writeText(settings.webhookUrl); setCopied(true); } catch { setError('無法自動複製 Webhook URL，請手動選取。'); }
  };

  if (initialLoading && !settings) return <LineIntegrationSkeleton />;
  if (!settings) return <><SettingsPageHeader title="LINE 整合" description="設定商家的 LINE Messaging API，並確認 Webhook、存取權杖與 Rich Menu 是否可正常運作。" /><SettingsSectionError title="暫時無法取得 LINE 整合設定，請稍後再試。" message={error || '暫時無法取得 LINE 整合設定，請稍後再試。'} onRetry={() => void load()} /></>;
  const currentHealth = health || unavailableHealth(settings);
  const canTest = canTestLineConnection(settings);
  return <main className="line-integration"><SettingsPageHeader title="LINE 整合" description="設定商家的 LINE Messaging API，並確認 Webhook、存取權杖與 Rich Menu 是否可正常運作。" />{error ? <SettingsSectionError title={stale ? '目前顯示的是先前載入的狀態' : 'LINE 操作未完成'} message={stale ? '目前顯示的是先前載入的狀態，部分資訊可能尚未同步。' : error} stale={stale} onRetry={() => void load(true)} /> : null}<BusinessLineConfigurationSummary settings={settings} health={currentHealth} /><LineHealthList health={currentHealth} /><LineCredentialEditor form={form.values} settings={settings} errors={form.fieldErrors} onChange={form.setField} /><LineWebhookSettings webhookUrl={settings.webhookUrl} onCopy={() => void copyWebhook()} copied={copied} /><LineIntegrationOperations canTest={canTest} canProvision={canProvisionRichMenu(settings, currentHealth)} pending={pending} onTest={() => void runOperation('test')} onProvision={() => void runOperation('rich')} /><LineIntegrationDangerZone /><StickySaveBar state={form.saveState} onSave={() => void save()} onDiscard={form.discard} primaryLabel="儲存設定" /></main>;
}
