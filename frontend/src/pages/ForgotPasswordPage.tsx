import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthShell from '../features/auth/AuthShell';
import { AuthErrorMessage, AuthStatusMessage } from '../features/auth/AuthMessages';
import { normalizeAuthError } from '../features/auth/authErrors';
import { forgotPasswordRequest, normalizeRecoveryIdentifier } from '../features/auth/passwordRecoveryDomain';
import { savePasswordResetState } from '../features/auth/passwordResetState';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const [identifier, setIdentifier] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedIdentifier = normalizeRecoveryIdentifier(identifier);
    setFieldError('');
    setRequestError('');
    if (!normalizedIdentifier) {
      setFieldError('請輸入電子郵件或使用者名稱。');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await api.requestPasswordResetOtp(forgotPasswordRequest(normalizedIdentifier));
      const resetState = savePasswordResetState(normalizedIdentifier);
      if (!resetState) {
        setRequestError('目前無法開始驗證流程，請稍後再試。');
        return;
      }
      navigate('/forgot-password/verify', { state: resetState });
    } catch (error) {
      setRequestError(normalizeAuthError(error, 'otp-request').message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return <AuthShell
    title="忘記密碼"
    description="輸入電子郵件或使用者名稱，我們會在帳號存在時寄送驗證碼。"
    footer={<Link to="/login"><i className="bi bi-arrow-left" aria-hidden="true" /> 返回登入</Link>}
  >
    <form className="auth-recovery" onSubmit={handleSubmit} noValidate>
      {requestError ? <AuthErrorMessage>{requestError}</AuthErrorMessage> : null}
      <div className="auth-recovery__field">
        <label htmlFor="recovery-identifier">電子郵件或使用者名稱</label>
        <input id="recovery-identifier" type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" aria-describedby={fieldError ? 'recovery-identifier-error' : undefined} aria-invalid={Boolean(fieldError)} disabled={submitting} required />
        {fieldError ? <p className="auth-recovery__field-error" id="recovery-identifier-error">{fieldError}</p> : null}
      </div>
      <button className="auth-recovery__primary" type="submit" disabled={submitting}>{submitting ? '寄送中…' : '寄送驗證碼'}</button>
      {submitting ? <AuthStatusMessage>寄送中…</AuthStatusMessage> : null}
      <p className="auth-recovery__note"><i className="bi bi-clock" aria-hidden="true" /> 驗證碼有效 10 分鐘。</p>
      <p className="visually-hidden" aria-live="polite">{requestError || ''}</p>
    </form>
  </AuthShell>;
}
