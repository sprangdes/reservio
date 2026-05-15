import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

export default function ForgotPasswordVerifyPage() {
  const { setMe } = useAuth();
  const { setErrorMessage, setSuccessMessage } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const account = params.get('account');
    if (account) {
      setEmailOrUsername(account);
    }
  }, [location.search]);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLocalError('');

    try {
      setSubmitting(true);
      const res = await api.verifyPasswordResetOtp({ emailOrUsername, otp });
      if (res?.data) {
        setMe(res.data);
      }
      setSuccessMessage('OTP 驗證成功，請更新密碼。');
      navigate('/force-change-password');
    } catch (err) {
      setLocalError(err.message || 'OTP 驗證失敗，請再試一次。');
      setErrorMessage(err.message || 'OTP 驗證失敗');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-gradient text-white text-white-strong p-4 text-center">
                <h4 className="mb-0 fw-bold">驗證一次性密碼</h4>
                <p className="mb-0 mt-2 opacity-75">請輸入信件中的 OTP，完成身分確認</p>
              </div>
              <div className="card-body p-4">
                {localError ? <div className="alert alert-danger shadow-sm mb-4">{localError}</div> : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="account" className="form-label">使用者名稱 / 電子郵件</label>
                    <input
                      type="text"
                      className="form-control"
                      id="account"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="請輸入帳號或電子郵件"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="otp" className="form-label">一次性密碼 (OTP)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                      placeholder="請輸入 6 位數 OTP"
                      required
                    />
                  </div>
                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm" disabled={submitting}>
                      {submitting ? '驗證中...' : '驗證 OTP'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="card-footer text-center py-3">
                <small className="text-muted">沒有收到信？ <Link to="/forgot-password" className="text-primary text-decoration-none fw-bold">重新寄送</Link></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
