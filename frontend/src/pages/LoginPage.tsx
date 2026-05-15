import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
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
    if (params.get('registered')) {
      setLocalSuccess('註冊成功。請登入您的帳號。');
    }
  }, [location.search]);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLocalError('');
    try {
      const res = await api.login({ username, password });
      setMe(res.data);
      setSuccessMessage('登入成功');
      if (res?.data?.mustChangePassword) {
        navigate('/force-change-password');
        return;
      }
      navigate('/');
    } catch (err) {
      setLocalError('使用者名稱或密碼不正確，請再試一次。');
      setErrorMessage(err.message);
    }
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
