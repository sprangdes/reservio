import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, API_BASE } from '../api';
import { useAuth } from '../state/AuthContext';
import { lineSafeErrorMessage, normalizeLineAccountLinkRequest, parseAccountLinkRequestToken, validateLineAccountLinkHandoff, type LineAccountLinkRequest } from '../features/line/lineDomain';

export default function LineAccountLinkPage() {
  const { me, loading } = useAuth();
  const location = useLocation();
  const request = useMemo(() => parseAccountLinkRequestToken(location.search), [location.search]);
  const [status, setStatus] = useState<LineAccountLinkRequest | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!request) {
      setError('缺少 LINE 帳號綁定資訊。');
      return;
    }
    void api.lineAccountLinkStatus(request.value)
      .then((response) => {
        const normalized = normalizeLineAccountLinkRequest(response.data);
        if (!normalized) throw new Error('malformed data');
        setStatus(normalized);
      })
      .catch((reason) => setError(lineSafeErrorMessage(reason)));
  }, [request]);

  const confirm = async () => {
    setConfirming(true);
    setError('');
    try {
      if (!request) throw new Error('invalid request');
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

  if (error) {
    return <main className="container my-5"><div className="alert alert-danger">{error}</div></main>;
  }
  if (!status || loading) {
    return <main className="container my-5">讀取綁定資訊中…</main>;
  }
  if (status.state !== 'created') {
    return (
      <main className="container my-5">
        <div className="alert alert-warning">此綁定連結已使用或已過期。</div>
      </main>
    );
  }

  return (
    <main className="container my-5">
      <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: 560 }}>
        <div className="card-body p-4">
          <h2 className="h4">綁定 Reservio 帳號</h2>
          <p>確認後，您在「{status.businessName}」透過 LINE 建立的既有預約會同步到目前帳號。</p>
          {!me || me.role !== 'ROLE_USER' || !me.lineLoginSession ? (
            <a
              href={`${API_BASE}/api/auth/line/user`}
              className="btn btn-success"
            >
              使用 LINE 登入並繼續
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-success"
              disabled={confirming}
              onClick={() => void confirm()}
            >
              {confirming ? '處理中…' : '確認綁定'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
