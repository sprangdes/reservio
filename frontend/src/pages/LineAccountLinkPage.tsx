import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { lineSafeErrorMessage, normalizeLineAccountLinkRequest, parseAccountLinkRequestToken, safeInternalReturnTo, validateLineAccountLinkHandoff, type LineAccountLinkRequest } from '../features/line/lineDomain';
import { useAuth } from '../state/AuthContext';

type LoadPhase = 'loading' | 'ready' | 'invalid' | 'error';

const statusContent: Record<Exclude<LineAccountLinkRequest['state'], 'created' | 'expired'>, { title: string; icon: string; copy: string }> = {
  'awaiting-line': { title: '等待 LINE 完成確認', icon: 'bi-hourglass-split', copy: '已前往 LINE 進行確認。完成後可重新檢查此帳號連結狀態。' },
  completed: { title: '已完成連結', icon: 'bi-check-circle-fill', copy: '這個商家的 LINE 預約關聯已連結到目前的 Reservio 帳號。' },
  failed: { title: '連結未完成', icon: 'bi-x-circle', copy: 'LINE 端未完成此次帳號連結。請返回商家的 LINE 對話，重新啟動帳號連結。' }
};

function formatExpiry(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '有效期限以商家 LINE 對話顯示為準' : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function LineAccountLinkPage() {
  const { me, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const request = useMemo(() => parseAccountLinkRequestToken(location.search), [location.search]);
  const [status, setStatus] = useState<LineAccountLinkRequest | null>(null);
  const [phase, setPhase] = useState<LoadPhase>(() => request ? 'loading' : 'invalid');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!request) {
      setStatus(null);
      setPhase('invalid');
      setError('這個 LINE 帳號連結資訊無法使用。請返回商家的 LINE 對話重新啟動帳號連結。');
      return;
    }
    setPhase('loading');
    setError('');
    try {
      const response = await api.lineAccountLinkStatus(request.value);
      const normalized = normalizeLineAccountLinkRequest(response.data);
      if (!normalized) throw new Error('malformed data');
      setStatus(normalized);
      setPhase('ready');
    } catch (reason) {
      setStatus(null);
      setPhase('error');
      setError(lineSafeErrorMessage(reason) === '此 LINE 帳號綁定連結無效、已使用或已過期。'
        ? '這個 LINE 帳號連結資訊無法使用。請返回商家的 LINE 對話重新啟動帳號連結。'
        : '暫時無法確認這個 LINE 帳號連結狀態，請稍後再試。');
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  const currentReturnTo = useMemo(() => safeInternalReturnTo(`${location.pathname}${location.search}`), [location.pathname, location.search]);
  const loginDestination = `/login?returnTo=${encodeURIComponent(currentReturnTo)}`;
  const returnToReservio = () => navigate('/');
  const returnToLine = () => {
    if (globalThis.history.length > 1) globalThis.history.back();
    else returnToReservio();
  };

  const confirm = async () => {
    if (!request || confirming) return;
    setConfirming(true);
    setError('');
    try {
      const response = await api.confirmLineAccountLink(request.value);
      const redirectUrl = typeof response.data === 'object' && response.data && 'redirectUrl' in response.data
        ? validateLineAccountLinkHandoff((response.data as { redirectUrl?: unknown }).redirectUrl)
        : null;
      if (!redirectUrl) throw new Error('invalid handoff');
      globalThis.location.assign(redirectUrl);
    } catch (reason) {
      setError(lineSafeErrorMessage(reason));
      setConfirming(false);
    }
  };

  const shell = (children: ReactNode) => <main className="line-account-link" aria-labelledby="line-account-link-title"><header className="line-account-link__mobile-header"><button type="button" onClick={returnToReservio} aria-label="返回 Reservio"><i className="bi bi-chevron-left" aria-hidden="true" />返回</button><strong>帳號連結</strong><span aria-hidden="true" /></header><section className="line-account-link__card">{children}</section></main>;

  if (phase === 'loading' || authLoading) return shell(<div className="line-account-link__skeleton" aria-busy="true" role="status"><span className="line-account-link__skeleton-title" /><span className="line-account-link__skeleton-business" /><span className="line-account-link__skeleton-copy" /><span className="line-account-link__skeleton-copy line-account-link__skeleton-copy--short" /><span className="line-account-link__skeleton-action" /><span className="visually-hidden">讀取 LINE 帳號連結資訊中</span></div>);

  if (phase === 'invalid' || phase === 'error') return shell(<><p className="line-account-link__eyebrow">帳號連結</p><h1 id="line-account-link-title">無法使用此連結</h1><div className="line-account-link__state line-account-link__state--error" role="alert"><i className="bi bi-exclamation-circle" aria-hidden="true" /><p>{error}</p></div><div className="line-account-link__actions"><button type="button" className="line-account-link__primary" onClick={phase === 'error' ? () => void load() : returnToLine}>{phase === 'error' ? '重新載入' : '返回 LINE'}</button><button type="button" className="line-account-link__secondary" onClick={returnToReservio}>返回 Reservio</button></div></>);

  if (!status) return null;

  if (status.state === 'expired') return shell(<><p className="line-account-link__eyebrow">帳號連結</p><h1 id="line-account-link-title">連結邀請已過期</h1><div className="line-account-link__state line-account-link__state--expired"><i className="bi bi-clock-history" aria-hidden="true" /><strong>連結邀請已過期</strong></div><p>這個一次性連結已無法使用。請返回 {status.businessName} 的 LINE 對話，重新啟動帳號連結。</p><p>這不會影響你與其他商家的 LINE 關聯。</p><div className="line-account-link__actions"><button type="button" className="line-account-link__primary" onClick={returnToLine}><i className="bi bi-line" aria-hidden="true" />返回 LINE</button><button type="button" className="line-account-link__secondary" onClick={returnToReservio}>返回 Reservio</button></div><p className="line-account-link__security"><i className="bi bi-shield-check" aria-hidden="true" />為保護帳號安全，過期連結無法再次使用。</p></>);

  if (status.state !== 'created') {
    const content = statusContent[status.state];
    return shell(<><p className="line-account-link__eyebrow">帳號連結</p><h1 id="line-account-link-title">{content.title}</h1><div className={`line-account-link__state line-account-link__state--${status.state}`} role="status"><i className={`bi ${content.icon}`} aria-hidden="true" /><strong>{content.title}</strong></div><p>{content.copy}</p>{status.state === 'awaiting-line' ? <button type="button" className="line-account-link__primary" onClick={() => void load()}><i className="bi bi-arrow-repeat" aria-hidden="true" />重新檢查狀態</button> : null}<button type="button" className="line-account-link__secondary" onClick={returnToReservio}>返回 Reservio</button></>);
  }

  const customerEligible = me?.role === 'ROLE_USER' && me.lineLoginSession;
  const businessRole = Boolean(me && me.role !== 'ROLE_USER');
  return shell(<><p className="line-account-link__eyebrow">帳號連結</p><h1 id="line-account-link-title">連結 LINE 帳號</h1><article className="line-account-link__business" aria-label={`商家 ${status.businessName}`}><i className="bi bi-shop" aria-hidden="true" /><span><strong>{status.businessName}</strong><small>商家 LINE 預約關聯</small></span></article><p>完成連結後，這個商家 LINE 對話中的既有預約可關聯到你的 Reservio 帳號。</p><p>此連結只套用於 {status.businessName}，不會影響其他商家的 LINE 關聯。</p><div className="line-account-link__validity"><i className="bi bi-clock" aria-hidden="true" /><span><strong>準備連結</strong><small>有效至 {formatExpiry(status.expiresAt)}</small></span></div>{error ? <div className="line-account-link__state line-account-link__state--error" role="alert"><i className="bi bi-exclamation-circle" aria-hidden="true" /><p>{error}</p></div> : null}{businessRole ? <div className="line-account-link__state line-account-link__state--error" role="alert"><i className="bi bi-person-x" aria-hidden="true" /><p>商家帳號無法完成此 LINE 帳號連結。請使用 Reservio 客戶帳號繼續。</p></div> : customerEligible ? <button type="button" className="line-account-link__primary" disabled={confirming} onClick={() => void confirm()}><i className="bi bi-line" aria-hidden="true" />{confirming ? '正在前往 LINE…' : '前往 LINE 完成連結'}</button> : <button type="button" className="line-account-link__primary" onClick={() => navigate(loginDestination)}><i className="bi bi-line" aria-hidden="true" />使用 LINE 登入並繼續</button>}<p className="line-account-link__handoff"><i className="bi bi-box-arrow-up-right" aria-hidden="true" />將離開 Reservio，前往 LINE 完成確認。</p><p className="line-account-link__security"><i className="bi bi-shield-check" aria-hidden="true" />不會顯示或公開你的 LINE 帳號識別資料。</p><button type="button" className="line-account-link__back" onClick={returnToReservio}><i className="bi bi-arrow-left" aria-hidden="true" />返回</button></>);
}
