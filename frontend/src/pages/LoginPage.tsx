import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE, api } from '../api';
import AuthShell from '../features/auth/AuthShell';
import PasswordField from '../features/auth/PasswordField';
import { resolvePostAuthDestination, type AuthDestinationUser } from '../features/auth/authDestination';
import { normalizeAuthError } from '../features/auth/authErrors';
import { customerLineReturnContext, loginReturnPresentation } from '../features/auth/loginPresentation';
import { clearReturnContext, consumeReturnContext, peekReturnContext, persistReturnContext } from '../features/auth/returnContext';
import { useAuth } from '../state/AuthContext';

type LoginPhase = 'idle' | 'credentials' | 'line' | 'callback';

function callbackParams(search: string): { success: boolean; failed: boolean } {
  const params = new URLSearchParams(search);
  return { success: params.get('lineLogin') === 'success', failed: params.get('lineLogin') === 'failed' };
}

export default function LoginPage() {
  const { refresh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<LoginPhase>('idle');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const callbackHandled = useRef(false);
  const authActionRef = useRef(false);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedReturnTo = params.get('returnTo');
  const returnPresentation = useMemo(() => loginReturnPresentation(requestedReturnTo || peekReturnContext()), [requestedReturnTo, location.search]);
  const isBusy = phase !== 'idle';

  const completeDestination = (user: AuthDestinationUser, allowStoredReturn = true) => {
    const returnTo = allowStoredReturn ? consumeReturnContext() : null;
    const destination = resolvePostAuthDestination(user, returnTo);
    navigate(destination.path, { replace: true });
  };

  useEffect(() => {
    const registeredParam = params.get('registered') === '1';
    if (registeredParam) {
      setRegistered(true);
      params.delete('registered');
      const nextSearch = params.toString();
      navigate({ pathname: '/login', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
      return;
    }

    const callback = callbackParams(location.search);
    if (callback.failed) {
      clearReturnContext();
      setError('無法完成 LINE 登入，請改用其他方式或稍後再試。');
      params.delete('lineLogin');
      params.delete('reason');
      params.delete('role');
      const nextSearch = params.toString();
      navigate({ pathname: '/login', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
      return;
    }
    if (params.has('lineLogin') && !callback.success) {
      params.delete('lineLogin');
      params.delete('reason');
      params.delete('role');
      const nextSearch = params.toString();
      navigate({ pathname: '/login', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
      return;
    }
    if (!callback.success || callbackHandled.current) return;
    callbackHandled.current = true;
    authActionRef.current = true;
    setPhase('callback');
    setError('');
    void (async () => {
      const user = await refresh();
      if (!user) {
        authActionRef.current = false;
        setPhase('idle');
        setError('LINE 登入已完成，但目前無法確認帳號狀態。請重新載入後再試。');
        return;
      }
      completeDestination(user);
    })();
  // Callback query must be processed before App auth-route redirect consumes the stored context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    const legacyReturnTo = sessionStorage.getItem('reservio.returnTo');
    const source = requestedReturnTo || legacyReturnTo;
    if (source) persistReturnContext(source);
    sessionStorage.removeItem('reservio.returnTo');
  }, [requestedReturnTo]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authActionRef.current || isBusy) return;
    if (!username.trim() || !password) {
      setError('請輸入使用者名稱與密碼。');
      return;
    }
    authActionRef.current = true;
    setPhase('credentials');
    setError('');
    try {
      await api.login({ username: username.trim(), password });
      setPassword('');
      const user = await refresh();
      if (!user) {
        authActionRef.current = false;
        setError('登入已完成，但目前無法確認帳號狀態。請重新載入後再試。');
        setPhase('idle');
        return;
      }
      completeDestination(user);
    } catch (requestError) {
      authActionRef.current = false;
      setPassword('');
      setError(normalizeAuthError(requestError, 'login').message);
      setPhase('idle');
    }
  };

  const startLineLogin = (kind: 'user' | 'business') => {
    if (authActionRef.current || isBusy) return;
    authActionRef.current = true;
    setError('');
    if (kind === 'user') {
      const safeCustomerReturn = customerLineReturnContext(requestedReturnTo || peekReturnContext());
      if (safeCustomerReturn) persistReturnContext(safeCustomerReturn);
      else clearReturnContext();
    } else {
      clearReturnContext();
    }
    setPhase('line');
    try {
      globalThis.location.assign(`${API_BASE}/api/auth/line/${kind}`);
    } catch {
      authActionRef.current = false;
      setPhase('idle');
      setError('目前無法前往 LINE，請稍後再試。');
    }
  };

  const contextBlock = returnPresentation
    ? <><i className="bi bi-calendar2-check" aria-hidden="true" /><div><strong>{returnPresentation.title}</strong><span>{returnPresentation.description}</span></div></>
    : <><i className="bi bi-person-check" aria-hidden="true" /><div><strong>登入你的 Reservio 帳號</strong><span>登入後會依你的帳號類型前往對應的 Reservio 工作區。</span></div></>;

  return <AuthShell title="登入 Reservio" status={contextBlock} footer={<><span>還沒有客戶帳號？</span><Link to="/register">建立客戶帳號</Link><span aria-hidden="true">·</span><span>要管理商家？</span><Link to="/register-business">建立商家帳號</Link></>}>
    {registered ? <p className="auth-shell__success" role="status">帳號已建立，請登入。</p> : null}
    {error ? <div className="auth-shell__error" role="alert">{error}{error.includes('重新載入') ? <button type="button" onClick={() => globalThis.location.reload()}>重新載入</button> : null}</div> : null}
    <form className="auth-login" onSubmit={handleSubmit} noValidate>
      <div className="auth-login__field">
        <label htmlFor="username">使用者名稱</label>
        <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="請輸入使用者名稱" disabled={isBusy} aria-describedby={error ? 'login-error' : undefined} required />
      </div>
      <PasswordField id="password" label="密碼" value={password} onChange={setPassword} mode="current" autoComplete="current-password" placeholder="請輸入密碼" disabled={isBusy} describedBy={error ? 'login-error' : undefined} required />
      {error ? <span id="login-error" className="visually-hidden">{error}</span> : null}
      <button className="auth-login__submit" type="submit" disabled={isBusy}>{phase === 'credentials' ? '登入中…' : '登入'}</button>
      <Link className="auth-login__forgot" to="/forgot-password">忘記密碼？</Link>
    </form>
    <div className="auth-login__divider" aria-hidden="true"><span /><p>或使用以下方式登入</p><span /></div>
    <div className="auth-login__line-actions" aria-live="polite">
      <button type="button" disabled={isBusy} onClick={() => startLineLogin('user')} aria-label="使用 LINE 登入客戶帳號，預約服務"><i className="auth-login__line-mark" aria-hidden="true">LINE</i><span><strong>使用 LINE 登入客戶帳號</strong><small>預約服務</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></button>
      <button type="button" disabled={isBusy} onClick={() => startLineLogin('business')} aria-label="使用 LINE 登入商家帳號，管理商家"><i className="auth-login__line-mark" aria-hidden="true">LINE</i><span><strong>使用 LINE 登入商家帳號</strong><small>管理商家</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></button>
      {phase === 'line' ? <p className="auth-login__pending" role="status">正在前往 LINE…</p> : null}
      {phase === 'callback' ? <p className="auth-login__pending" role="status">正在確認登入狀態…</p> : null}
    </div>
  </AuthShell>;
}
