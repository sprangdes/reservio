import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthShell from '../features/auth/AuthShell';
import { AuthErrorMessage, AuthStatusMessage } from '../features/auth/AuthMessages';
import PasswordField from '../features/auth/PasswordField';
import { resolvePostAuthDestination } from '../features/auth/authDestination';
import { normalizeAuthError } from '../features/auth/authErrors';
import { clearPasswordResetState } from '../features/auth/passwordResetState';
import { useAuth } from '../state/AuthContext';

type ForceChangePhase = 'idle' | 'submitting' | 'refresh-failed';

export default function ForceChangePasswordPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const [newPassword, setNewPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [phase, setPhase] = useState<ForceChangePhase>('idle');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || phase === 'refresh-failed') return;
    setFieldError('');
    setRequestError('');
    if (!newPassword) {
      setFieldError('請輸入新密碼。');
      return;
    }
    submittingRef.current = true;
    setPhase('submitting');
    try {
      await api.forceChangePassword({ newPassword });
      setNewPassword('');
      const user = await refresh();
      if (!user || user.mustChangePassword) {
        setPhase('refresh-failed');
        setRequestError('密碼已更新，但目前無法確認帳號狀態。請重新載入後再試。');
        return;
      }
      clearPasswordResetState();
      navigate(resolvePostAuthDestination(user).path, { replace: true });
    } catch (error) {
      setNewPassword('');
      setRequestError(normalizeAuthError(error, 'force-change').message);
      setPhase('idle');
    } finally {
      submittingRef.current = false;
      setPhase((current) => current === 'submitting' ? 'idle' : current);
    }
  };

  return <AuthShell title="設定新密碼" description="為了保護帳號安全，請先設定新密碼再繼續使用 Reservio。">
    <form className="auth-recovery auth-recovery--force" onSubmit={handleSubmit} noValidate>
      {requestError ? <AuthErrorMessage>{requestError}</AuthErrorMessage> : null}
      <PasswordField id="newPassword" label="新密碼" value={newPassword} onChange={setNewPassword} mode="new" autoComplete="new-password" error={fieldError} disabled={phase !== 'idle'} required />
      <button className="auth-recovery__primary" type="submit" disabled={phase !== 'idle'}>{phase === 'submitting' ? '正在更新密碼…' : '更新密碼並繼續'}</button>
      {phase === 'submitting' ? <AuthStatusMessage>正在更新密碼…</AuthStatusMessage> : null}
      {phase === 'refresh-failed' ? <button className="auth-recovery__reload" type="button" onClick={() => globalThis.location.reload()}>重新載入</button> : null}
    </form>
  </AuthShell>;
}
