import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AccountTypeChoice from '../features/auth/AccountTypeChoice';
import AuthShell from '../features/auth/AuthShell';
import { AuthErrorMessage, AuthStatusMessage } from '../features/auth/AuthMessages';
import PasswordField from '../features/auth/PasswordField';
import { normalizeAuthError } from '../features/auth/authErrors';
import { clearMerchantRegistrationDraft, loadMerchantRegistrationDraft, saveMerchantRegistrationDraft } from '../features/auth/merchantRegistrationDraft';
import { merchantRegistrationPayload, normalizeBusinessCategories, registrationIdentity, validateMerchantRegistration, type MerchantRegistrationForm } from '../features/auth/registrationDomain';

type CategoryState = 'idle' | 'loading' | 'ready' | 'error';

const emptyForm: MerchantRegistrationForm = { username: '', email: '', password: '', businessName: '', category: '', phone: '', address: '' };

export default function RegisterBusinessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryState, setCategoryState] = useState<CategoryState>('idle');
  const [form, setForm] = useState<MerchantRegistrationForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof MerchantRegistrationForm, string>>>({});
  const [requestError, setRequestError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  const loadCategories = useCallback(async () => {
    setCategoryState('loading');
    try {
      const response = await api.businessCategories();
      const values = normalizeBusinessCategories(response.data);
      setCategories(values);
      setCategoryState('ready');
      setForm((current) => values.includes(current.category) ? current : { ...current, category: '' });
    } catch {
      setCategories([]);
      setCategoryState('error');
    }
  }, []);

  useEffect(() => {
    const draft = loadMerchantRegistrationDraft();
    const identity = registrationIdentity(location.state);
    setForm((current) => ({ ...current, ...draft, ...identity, password: '' }));
    void loadCategories();
  }, [loadCategories, location.state]);

  useEffect(() => {
    saveMerchantRegistrationDraft({ username: form.username, email: form.email, businessName: form.businessName, category: form.category, phone: form.phone, address: form.address });
  }, [form.username, form.email, form.businessName, form.category, form.phone, form.address]);

  const update = (field: keyof MerchantRegistrationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const switchToCustomer = () => {
    clearMerchantRegistrationDraft();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateMerchantRegistration(form, categories);
    setErrors(validation);
    setRequestError('');
    if (Object.keys(validation).length > 0 || categoryState !== 'ready') return;

    submitting.current = true;
    setPending(true);
    try {
      await api.registerBusiness(merchantRegistrationPayload(form));
      setForm((current) => ({ ...current, password: '' }));
      clearMerchantRegistrationDraft();
      navigate('/login?registered=1', { replace: true });
    } catch (error) {
      setForm((current) => ({ ...current, password: '' }));
      setRequestError(normalizeAuthError(error, 'merchant-registration').message);
      setPending(false);
      submitting.current = false;
    }
  };

  return <AuthShell variant="wide" title="建立商家帳號" description="建立帳號時會同時建立商家資料，完成後即可登入並開始管理預約。" status={<><i className="bi bi-shop" aria-hidden="true" /><div><strong>商家帳號</strong><span>預約管理與商家資料使用同一組登入資訊。</span></div></>} footer={<><span>已有帳號？</span><Link to="/login">登入</Link></>}>
    <div className="auth-registration auth-registration--merchant">
      <AccountTypeChoice selected="merchant" customerState={{ registrationIdentity: { username: form.username, email: form.email } }} onCustomerSelect={switchToCustomer} disabled={pending} />
      <Link className="auth-registration__switch" to="/register" state={{ registrationIdentity: { username: form.username, email: form.email } }} onClick={switchToCustomer}>只想預約服務？建立客戶帳號</Link>
      {requestError ? <AuthErrorMessage id="merchant-registration-error">{requestError}</AuthErrorMessage> : null}
      <form className="auth-registration__form" onSubmit={handleSubmit} noValidate aria-describedby={requestError ? 'merchant-registration-error' : undefined}>
        <fieldset className="auth-registration__group" disabled={pending}>
          <legend>帳號資料</legend>
          <div className="auth-registration__grid">
            <div className="auth-registration__field">
              <label htmlFor="merchant-username">使用者名稱</label>
              <input id="merchant-username" type="text" value={form.username} onChange={(event) => update('username', event.target.value)} autoComplete="username" aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'merchant-username-error' : undefined} />
              {errors.username ? <span id="merchant-username-error" className="auth-registration__field-error">{errors.username}</span> : null}
            </div>
            <div className="auth-registration__field">
              <label htmlFor="merchant-email">電子郵件</label>
              <input id="merchant-email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'merchant-email-error' : undefined} />
              {errors.email ? <span id="merchant-email-error" className="auth-registration__field-error">{errors.email}</span> : null}
            </div>
          </div>
          <PasswordField id="merchant-password" label="密碼" value={form.password} onChange={(value) => update('password', value)} mode="new" autoComplete="new-password" error={errors.password} disabled={pending} required />
        </fieldset>

        <fieldset className="auth-registration__group auth-registration__group--business" disabled={pending}>
          <legend>商家資料</legend>
          <div className="auth-registration__field">
            <label htmlFor="merchant-business-name">商家名稱</label>
            <input id="merchant-business-name" type="text" value={form.businessName} onChange={(event) => update('businessName', event.target.value)} autoComplete="organization" aria-invalid={Boolean(errors.businessName)} aria-describedby={errors.businessName ? 'merchant-business-name-error' : undefined} />
            {errors.businessName ? <span id="merchant-business-name-error" className="auth-registration__field-error">{errors.businessName}</span> : null}
          </div>
          <div className="auth-registration__grid">
            <div className="auth-registration__field">
              <label htmlFor="merchant-category">類別</label>
              <select id="merchant-category" value={form.category} onChange={(event) => update('category', event.target.value)} disabled={pending || categoryState !== 'ready'} aria-invalid={Boolean(errors.category)} aria-describedby={`${categoryState === 'loading' ? 'merchant-category-status' : categoryState === 'error' ? 'merchant-category-error' : ''}${errors.category ? ' merchant-category-field-error' : ''}`.trim() || undefined}>
                <option value="">{categoryState === 'loading' ? '載入商家類別中…' : '請選擇類別'}</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              {categoryState === 'loading' ? <span id="merchant-category-status" className="auth-registration__hint" role="status">正在載入商家類別…</span> : null}
              {categoryState === 'error' ? <span id="merchant-category-error" className="auth-registration__category-error" role="alert">暫時無法載入商家類別。 <button type="button" onClick={() => void loadCategories()} disabled={pending}>重新載入</button></span> : null}
              {errors.category ? <span id="merchant-category-field-error" className="auth-registration__field-error">{errors.category}</span> : null}
            </div>
            <div className="auth-registration__field">
              <label htmlFor="merchant-phone">電話</label>
              <input id="merchant-phone" type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'merchant-phone-error' : undefined} />
              {errors.phone ? <span id="merchant-phone-error" className="auth-registration__field-error">{errors.phone}</span> : null}
            </div>
          </div>
          <div className="auth-registration__field">
            <label htmlFor="merchant-address">地址</label>
            <input id="merchant-address" type="text" value={form.address} onChange={(event) => update('address', event.target.value)} autoComplete="street-address" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'merchant-address-error' : undefined} />
            {errors.address ? <span id="merchant-address-error" className="auth-registration__field-error">{errors.address}</span> : null}
          </div>
        </fieldset>

        <button className="auth-registration__submit" type="submit" disabled={pending || categoryState !== 'ready'}>{pending ? '建立中…' : '建立商家帳號'}</button>
        {pending ? <AuthStatusMessage>正在建立商家帳號…</AuthStatusMessage> : null}
      </form>
      <p className="auth-registration__support">建立成功後，請登入你的商家帳號。</p>
    </div>
  </AuthShell>;
}
