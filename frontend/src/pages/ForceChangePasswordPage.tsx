import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

export default function ForceChangePasswordPage() {
  const { me, setMe } = useAuth();
  const { setErrorMessage, setSuccessMessage } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLocalError('');

    if (newPassword !== confirmPassword) {
      setLocalError('兩次輸入的密碼不一致。');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.forceChangePassword({ newPassword });
      if (res?.data) {
        setMe(res.data);
      } else {
        setMe(me ? { ...me, mustChangePassword: false } : null);
      }
      setSuccessMessage('密碼更新成功，已完成登入。');
      navigate('/');
    } catch (err) {
      setLocalError(err.message || '密碼更新失敗，請稍後再試。');
      setErrorMessage(err.message || '密碼更新失敗');
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
                <h4 className="mb-0 fw-bold">更新密碼</h4>
                <p className="mb-0 mt-2 opacity-75">為了帳號安全，請先設定新密碼</p>
              </div>
              <div className="card-body p-4">
                {localError ? <div className="alert alert-danger shadow-sm mb-4">{localError}</div> : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">新密碼</label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="請輸入新密碼"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">確認新密碼</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="請再次輸入新密碼"
                      required
                    />
                  </div>
                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-gradient btn-lg fw-bold shadow-sm" disabled={submitting}>
                      {submitting ? '更新中...' : '更新密碼並登入'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
