import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthShell from '../features/auth/AuthShell';
import { AuthErrorMessage, AuthStatusMessage } from '../features/auth/AuthMessages';
import OtpInput, { sanitizeOtp } from '../features/auth/OtpInput';
import { normalizeAuthError } from '../features/auth/authErrors';
import { forgotPasswordRequest, verifyPasswordOtpRequest } from '../features/auth/passwordRecoveryDomain';
import { clearPasswordResetState, loadPasswordResetState, savePasswordResetState, type PasswordResetState } from '../features/auth/passwordResetState';
import { useAuth } from '../state/AuthContext';

type VerifyPhase = 'idle' | 'verify' | 'resend' | 'refresh-failed';

function routeResetState(value: unknown): PasswordResetState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<PasswordResetState>;
  if (typeof state.identifier !== 'string' || !state.identifier.trim() || typeof state.requestedAt !== 'number') return null;
  if (state.requestedAt > Date.now() || Date.now() - state.requestedAt > 10 * 60 * 1000) return null;
  return { identifier: state.identifier.trim(), requestedAt: state.requestedAt };
}

export default function ForgotPasswordVerifyPage() {
  const { refresh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const actionRef = useRef(false);
  const [otp, setOtp] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [status, setStatus] = useState('若帳號存在，驗證碼已寄至對應信箱。');
  const [phase, setPhase] = useState<VerifyPhase>('idle');
  const retainedState = useMemo(() => routeResetState(location.state) || loadPasswordResetState(), [location.state]);
  const identifier = retainedState?.identifier || '';
  const busy = phase === 'verify' || phase === 'resend';

  useEffect(() => {
    if (new URLSearchParams(location.search).has('account')) {
      navigate('/forgot-password/verify', { replace: true, state: retainedState || undefined });
      return;
    }
    if (!retainedState) {
      clearPasswordResetState();
      navigate('/forgot-password', { replace: true });
    }
  }, [location.search, navigate, retainedState]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (actionRef.current || !identifier) return;
    const normalizedOtp = sanitizeOtp(otp);
    setFieldError('');
    setRequestError('');
    setStatus('');
    if (normalizedOtp.length !== 6) {
      setFieldError('請輸入完整的 6 位數驗證碼。');
      return;
    }
    actionRef.current = true;
    setPhase('verify');
    try {
      await api.verifyPasswordResetOtp(verifyPasswordOtpRequest(identifier, normalizedOtp));
      setOtp('');
      const user = await refresh();
      if (!user || !user.mustChangePassword) {
        setPhase('refresh-failed');
        setRequestError('驗證已完成，但目前無法確認帳號狀態。請重新載入後再試。');
        return;
      }
      clearPasswordResetState();
      navigate('/force-change-password', { replace: true });
    } catch (requestError) {
      setOtp('');
      const normalizedError = normalizeAuthError(requestError, 'otp-verify');
      if (normalizedError.category === 'OTP_INVALID_OR_EXPIRED' || normalizedError.category === 'VALIDATION') setFieldError(normalizedError.message);
      else setRequestError(normalizedError.message);
      setPhase('idle');
    } finally {
      actionRef.current = false;
      setPhase((current) => current === 'verify' ? 'idle' : current);
    }
  };

  const handleResend = async () => {
    if (actionRef.current) return;
    if (!identifier) {
      clearPasswordResetState();
      navigate('/forgot-password', { replace: true });
      return;
    }
    actionRef.current = true;
    setPhase('resend');
    setFieldError('');
    setRequestError('');
    setStatus('');
    try {
      await api.requestPasswordResetOtp(forgotPasswordRequest(identifier));
      const nextState = savePasswordResetState(identifier);
      setOtp('');
      setStatus('若帳號存在，新的驗證碼已寄至對應信箱。');
      navigate('/forgot-password/verify', { replace: true, state: nextState || undefined });
    } catch (requestError) {
      setRequestError(normalizeAuthError(requestError, 'otp-request').message);
    } finally {
      actionRef.current = false;
      setPhase('idle');
    }
  };

  if (!retainedState) return null;

  return <AuthShell title="輸入驗證碼" description="輸入收到的 6 位數驗證碼。" footer={<Link to="/forgot-password"><i className="bi bi-arrow-left" aria-hidden="true" /> 返回</Link>}>
    <form className="auth-recovery auth-recovery--otp" onSubmit={handleVerify} noValidate>
      {status ? <p className="auth-shell__success" role="status" aria-live="polite">{status}</p> : null}
      {requestError ? <AuthErrorMessage>{requestError}</AuthErrorMessage> : null}
      <OtpInput id="password-reset-otp" value={otp} onChange={setOtp} error={fieldError || undefined} describedBy="password-reset-otp-error" disabled={busy || phase === 'refresh-failed'} />
      <p className="auth-recovery__note"><i className="bi bi-shield-check" aria-hidden="true" /> 驗證碼有效 10 分鐘。</p>
      <button className="auth-recovery__primary" type="submit" disabled={busy || phase === 'refresh-failed' || otp.length !== 6}>{phase === 'verify' ? '驗證中…' : '驗證'}</button>
      <button className="auth-recovery__secondary" type="button" onClick={handleResend} disabled={busy || phase === 'refresh-failed'}>{phase === 'resend' ? '重新寄送中…' : '重新取得驗證碼'}</button>
      {busy ? <AuthStatusMessage>{phase === 'verify' ? '驗證中…' : '重新寄送中…'}</AuthStatusMessage> : null}
      {phase === 'refresh-failed' ? <button className="auth-recovery__reload" type="button" onClick={() => globalThis.location.reload()}>重新載入</button> : null}
    </form>
  </AuthShell>;
}
