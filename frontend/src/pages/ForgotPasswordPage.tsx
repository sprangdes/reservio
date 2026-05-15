import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../state/ToastContext';

export default function ForgotPasswordPage() {
  const { setErrorMessage } = useToast();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLocalError('');
    setLocalSuccess('');

    try {
      setSubmitting(true);
      await api.requestPasswordResetOtp({ emailOrUsername });
      setLocalSuccess('若帳號存在，系統已寄送一次性密碼到您的信箱。');
      setTimeout(() => {
        navigate(`/forgot-password/verify?account=${encodeURIComponent(emailOrUsername)}`);
      }, 600);
    } catch (err) {
      setLocalError(err.message || '寄送 OTP 失敗，請稍後再試。');
      setErrorMessage(err.message || '寄送 OTP 失敗');
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
                <h4 className="mb-0 fw-bold">忘記密碼</h4>
                <p className="mb-0 mt-2 opacity-75">輸入帳號或電子郵件，我們將寄送一次性密碼給您</p>
              </div>
              <div className="card-body p-4">
                {localSuccess ? <div className="alert alert-success shadow-sm mb-4">{localSuccess}</div> : null}
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
                      autoFocus
                    />
                  </div>
                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm" disabled={submitting}>
                      {submitting ? '寄送中...' : '寄送一次性密碼'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="card-footer text-center py-3">
                <small className="text-muted">想起密碼了？ <Link to="/login" className="text-primary text-decoration-none fw-bold">返回登入</Link></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
