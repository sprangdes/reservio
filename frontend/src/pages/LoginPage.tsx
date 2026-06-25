import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, API_BASE } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

export default function LoginPage() {
  const { setMe } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedReturnTo = params.get('returnTo');
    if (requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//')) {
      sessionStorage.setItem('reservio.returnTo', requestedReturnTo);
    }
    if (params.get('registered')) {
      setLocalSuccess('註冊成功。請登入您的帳號。');
    }

    const lineLogin = params.get('lineLogin');
    const role = params.get('role');
    const reason = params.get('reason');

    if (lineLogin === 'success') {
      void (async () => {
        try {
          const res = await api.me();
          setMe(res.data);
          setSuccessMessage('LINE 登入成功');

          if (res?.data?.mustChangePassword) {
            navigate('/force-change-password', { replace: true });
            return;
          }

          const returnTo = safeReturnTo();
          navigate(returnTo, { replace: true, state: { lineRole: role } });
        } catch (err: any) {
          setLocalError('LINE 登入成功，但讀取使用者資訊失敗，請再試一次。');
          setErrorMessage(err?.message || 'LINE 登入失敗');
        }
      })();
    }

    if (lineLogin === 'failed') {
      const reasonText = reason ? `（${reason}）` : '';
      setLocalError(`LINE 登入失敗${reasonText}`);
    }
  }, [location.search]);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLocalError('');
    try {
      const res = await api.login({ username, password });
      setPassword('');
      setMe(res.data);
      setSuccessMessage('登入成功');
      if (res?.data?.mustChangePassword) {
        navigate('/force-change-password');
        return;
      }
      navigate(safeReturnTo());
    } catch (err: any) {
      setPassword('');
      setLocalError('使用者名稱或密碼不正確，請再試一次。');
      setErrorMessage(err.message);
    }
  };

  const safeReturnTo = () => {
    const returnTo = sessionStorage.getItem('reservio.returnTo');
    sessionStorage.removeItem('reservio.returnTo');
    return returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  };

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h4 className="mb-0 fw-bold">歡迎回來</h4>
                <p className="mb-0 mt-2 opacity-75">登入以管理您的預約服務</p>
              </div>

              <div className="card-body p-4">
                {localSuccess ? <div className="alert alert-success shadow-sm mb-4">{localSuccess}</div> : null}
                {localError ? <div className="alert alert-danger shadow-sm">{localError}</div> : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">使用者名稱 / 電子郵件</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="請輸入帳號"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">密碼</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="請輸入密碼"
                      required
                    />
                  </div>
                  <div className="text-end">
                    <Link to="/forgot-password" className="small text-decoration-none">
                      忘記密碼？
                    </Link>
                  </div>
                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm">登入系統</button>
                  </div>
                </form>

                <div className="my-4 d-flex align-items-center">
                  <hr className="flex-grow-1" />
                  <span className="px-3 text-muted small">或使用 LINE</span>
                  <hr className="flex-grow-1" />
                </div>

                <div className="d-grid gap-2">
                  <a href={`${API_BASE}/api/auth/line/user`} className="btn btn-success btn-lg fw-bold">
                    使用 LINE 客戶登入
                  </a>
                  <a href={`${API_BASE}/api/auth/line/business`} className="btn btn-outline-success btn-lg fw-bold">
                    使用 LINE 商家登入
                  </a>
                </div>
              </div>

              <div className="card-footer text-center py-3">
                <small className="text-muted">還沒有帳號嗎？ <Link to="/register" className="text-primary text-decoration-none fw-bold">立即註冊</Link></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
