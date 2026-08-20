import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AccountTypeChoice from '../features/auth/AccountTypeChoice';
import AuthShell from '../features/auth/AuthShell';
import { AuthErrorMessage, AuthStatusMessage } from '../features/auth/AuthMessages';
import PasswordField from '../features/auth/PasswordField';
import { normalizeAuthError } from '../features/auth/authErrors';
import { saveMerchantRegistrationDraft } from '../features/auth/merchantRegistrationDraft';
import { customerRegistrationPayload, registrationIdentity, validateCustomerRegistration, type CustomerRegistrationForm } from '../features/auth/registrationDomain';

const initialForm = (state: unknown): CustomerRegistrationForm => {
  const identity = registrationIdentity(state);
  return { username: identity?.username ?? '', email: identity?.email ?? '', password: '', confirmPassword: '' };
};

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState<CustomerRegistrationForm>(() => initialForm(location.state));
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerRegistrationForm, string>>>({});
  const [requestError, setRequestError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  const update = (field: keyof CustomerRegistrationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateCustomerRegistration(form);
    setErrors(validation);
    setRequestError('');
    if (Object.keys(validation).length > 0) return;

    submitting.current = true;
    setPending(true);
    try {
      await api.register(customerRegistrationPayload(form));
      setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
      navigate('/login?registered=1', { replace: true });
    } catch (error) {
      setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
      setRequestError(normalizeAuthError(error, 'customer-registration').message);
      setPending(false);
      submitting.current = false;
    }
  };

  const transferToMerchant = () => {
    saveMerchantRegistrationDraft({ username: form.username, email: form.email });
  };

  return <AuthShell title="建立客戶帳號" description="建立帳號後，即可登入並開始預約。" footer={<p className="auth-shell__login-prompt"><span>已有帳號？</span><Link to="/login">登入</Link></p>}>
    <div className="auth-registration">
      <AccountTypeChoice selected="customer" merchantState={{ registrationIdentity: { username: form.username, email: form.email } }} onMerchantSelect={transferToMerchant} disabled={pending} />
      {requestError ? <AuthErrorMessage id="customer-registration-error">{requestError}</AuthErrorMessage> : null}
      <form className="auth-registration__form" onSubmit={handleSubmit} noValidate aria-describedby={requestError ? 'customer-registration-error' : undefined}>
        <div className="auth-registration__field">
          <label htmlFor="register-username">使用者名稱</label>
          <input id="register-username" type="text" value={form.username} onChange={(event) => update('username', event.target.value)} autoComplete="username" disabled={pending} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'register-username-error' : undefined} />
          {errors.username ? <span id="register-username-error" className="auth-registration__field-error">{errors.username}</span> : null}
        </div>
        <div className="auth-registration__field">
          <label htmlFor="register-email">電子郵件</label>
          <input id="register-email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" inputMode="email" disabled={pending} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} />
          {errors.email ? <span id="register-email-error" className="auth-registration__field-error">{errors.email}</span> : null}
        </div>
        <PasswordField id="register-password" label="密碼" value={form.password} onChange={(value) => update('password', value)} mode="new" autoComplete="new-password" error={errors.password} disabled={pending} required />
        <PasswordField id="register-confirm-password" label="確認密碼" value={form.confirmPassword} onChange={(value) => update('confirmPassword', value)} mode="new" autoComplete="new-password" error={errors.confirmPassword} disabled={pending} required />
        <button className="auth-registration__submit" type="submit" disabled={pending}>{pending ? '建立中…' : '建立客戶帳號'}</button>
        {pending ? <AuthStatusMessage>正在建立客戶帳號…</AuthStatusMessage> : null}
      </form>
      <p className="auth-registration__support">建立成功後，請登入你的帳號。</p>
    </div>
  </AuthShell>;
}
