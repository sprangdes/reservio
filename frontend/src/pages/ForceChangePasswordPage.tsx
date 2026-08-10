import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import PasswordField from '../features/auth/PasswordField';
import { normalizeAuthError } from '../features/auth/authErrors';
import { resolvePostAuthDestination } from '../features/auth/authDestination';

export default function ForceChangePasswordPage() {
  const { refresh } = useAuth();
  const { setErrorMessage, setSuccessMessage } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLocalError('');

    try {
      setSubmitting(true);
      await api.forceChangePassword({ newPassword });
      setNewPassword('');
      await refresh();
      const res = await api.me();
      setSuccessMessage('密碼更新成功，已完成登入。');
      navigate(resolvePostAuthDestination(res.data).path);
    } catch (err) {
      setNewPassword('');
      const normalized = normalizeAuthError(err, 'force-change');
      setLocalError(normalized.message);
      setErrorMessage(normalized.message);
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
                  <PasswordField id="newPassword" label="新密碼" value={newPassword} onChange={setNewPassword} mode="new" placeholder="請輸入新密碼" required disabled={submitting} />
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
