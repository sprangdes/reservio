import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, API_BASE } from '../api';
import { useAuth } from '../state/AuthContext';

interface LinkStatus {
  businessName: string;
  status: string;
  expiresAt: string;
}

export default function LineAccountLinkPage() {
  const { me, loading } = useAuth();
  const location = useLocation();
  const requestToken = useMemo(
    () => new URLSearchParams(location.search).get('request') || '',
    [location.search]
  );
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!requestToken) {
      setError('缺少 LINE 帳號綁定資訊。');
      return;
    }
    void api.lineAccountLinkStatus(requestToken)
      .then((response) => setStatus(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : '讀取綁定資訊失敗'));
  }, [requestToken]);

  const rememberReturnPath = () => {
    const returnTo = `${location.pathname}${location.search}`;
    sessionStorage.setItem('reservio.returnTo', returnTo);
  };

  const confirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const response = await api.confirmLineAccountLink(requestToken);
      globalThis.location.assign(response.data.redirectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '無法確認帳號綁定');
      setConfirming(false);
    }
  };

  if (error) {
    return <main className="container my-5"><div className="alert alert-danger">{error}</div></main>;
  }
  if (!status || loading) {
    return <main className="container my-5">讀取綁定資訊中…</main>;
  }
  if (status.status !== 'CREATED') {
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
          {!me || me.role !== 'ROLE_USER' || !me.lineLoginLinked ? (
            <a
              href={`${API_BASE}/api/auth/line/user`}
              className="btn btn-success"
              onClick={rememberReturnPath}
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
