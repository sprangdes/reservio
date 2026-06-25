import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';

interface LinkStatus {
  businessName: string;
  status: string;
  expiresAt: string;
}

export default function LineAccountLinkPage() {
  const { me, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  const login = () => {
    const returnTo = `${location.pathname}${location.search}`;
    sessionStorage.setItem('reservio.returnTo', returnTo);
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
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
          {!me ? (
            <button type="button" className="btn btn-primary" onClick={login}>
              登入 Reservio 後繼續
            </button>
          ) : me.role !== 'ROLE_USER' ? (
            <div className="alert alert-warning mb-0">請登出商家帳號，改用 Reservio 客戶帳號登入。</div>
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
