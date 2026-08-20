import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { useModalFocusTrap } from '../business-operations/reservations/ui/useModalFocusTrap';
import { notificationPreferenceErrorMessage } from '../notification-preferences/notificationPreferencesDomain';
import { validateOtp } from '../business-settings/notifications/notificationPreferences';

type VerificationStep = 'request' | 'otp' | 'refresh';

type CustomerEmailVerificationFlowProps = {
  email: string;
  onClose: () => void;
  onVerified: () => Promise<void>;
};

const refreshFailureMessage = '驗證已完成，但通知設定尚未同步，請重新載入後再試。';

/**
 * Customer-only presentation for the shared Email verification APIs. OTP remains
 * transient in this component and never participates in notification dirty state.
 */
export default function CustomerEmailVerificationFlow({
  email,
  onClose,
  onVerified
}: Readonly<CustomerEmailVerificationFlowProps>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalFocusTrap<HTMLElement>(closeRef);
  const [step, setStep] = useState<VerificationStep>('request');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');

  useEffect(() => {
    // The portal is a sibling of the application root. Inerting the whole root
    // keeps the customer header as well as the page itself out of the dialog's
    // tab order and prevents pointer interaction behind the modal.
    const applicationRoot = document.getElementById('root');
    const hadInert = applicationRoot?.hasAttribute('inert') ?? false;
    const previousAriaHidden = applicationRoot?.getAttribute('aria-hidden') ?? null;
    applicationRoot?.setAttribute('inert', '');
    applicationRoot?.setAttribute('aria-hidden', 'true');
    return () => {
      if (!applicationRoot) return;
      if (!hadInert) applicationRoot.removeAttribute('inert');
      if (previousAriaHidden === null) applicationRoot.removeAttribute('aria-hidden');
      else applicationRoot.setAttribute('aria-hidden', previousAriaHidden);
    };
  }, []);

  useEffect(() => () => setOtp(''), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending]);

  const close = () => {
    if (pending) return;
    setOtp('');
    setError('');
    setRequestStatus('');
    onClose();
  };

  const requestCode = async (stayOnOtp = false) => {
    if (pending) return;
    setPending(true);
    setError('');
    setRequestStatus('');
    try {
      await api.requestEmailVerification({ email });
      setStep('otp');
      if (stayOnOtp) setRequestStatus('已重新寄送驗證碼。');
      window.setTimeout(() => otpRef.current?.focus(), 0);
    } catch (reason) {
      setError(notificationPreferenceErrorMessage(reason, 'request'));
      if (stayOnOtp) setStep('otp');
    } finally {
      setPending(false);
    }
  };

  const refreshAuthoritativeState = async (afterVerification = false) => {
    if (pending && !afterVerification) return;
    setPending(true);
    setError('');
    try {
      await onVerified();
      setOtp('');
      setError('');
      setRequestStatus('');
      onClose();
    } catch {
      setStep('refresh');
      setError(refreshFailureMessage);
    } finally {
      setPending(false);
    }
  };

  const verifyCode = async () => {
    const validation = validateOtp(otp);
    if (validation) {
      setError('請輸入 6 位數驗證碼');
      return;
    }
    if (pending) return;
    setPending(true);
    setError('');
    setRequestStatus('');
    try {
      await api.verifyEmail({ otp });
      setOtp('');
      setStep('refresh');
      await refreshAuthoritativeState(true);
    } catch (reason) {
      setError(notificationPreferenceErrorMessage(reason, 'verify'));
      setPending(false);
    }
  };

  const title = step === 'request' ? '驗證 Email' : step === 'otp' ? '輸入驗證碼' : '確認驗證狀態';
  const description = step === 'request'
    ? '我們會將驗證碼寄到目前的帳號 Email。'
    : step === 'otp'
      ? `我們已將驗證碼寄到 ${email}。`
      : '正在確認目前帳號的 Email 驗證狀態。';

  return createPortal(
    <div className="customer-email-verification" role="presentation">
      <div className="customer-email-verification__backdrop" aria-hidden="true" />
      <section
        ref={dialogRef}
        className="customer-email-verification__surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-email-verification-title"
        aria-describedby="customer-email-verification-description"
      >
        <span className="customer-email-verification__handle" aria-hidden="true" />
        <header className="customer-email-verification__header">
          <h2 id="customer-email-verification-title">{title}</h2>
          <button ref={closeRef} type="button" aria-label="關閉驗證 Email" disabled={pending} onClick={close}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <p id="customer-email-verification-description" className="customer-email-verification__description">{description}</p>

        {step !== 'refresh' ? <div className="customer-email-verification__identity">
          <span>驗證 Email</span>
          <strong>{email}</strong>
        </div> : null}

        {step === 'request' ? <p className="customer-email-verification__note">請確認這是你目前可以收信的 Email。</p> : null}

        {step === 'otp' ? <div className="customer-email-verification__otp-group">
          <label htmlFor="customer-email-verification-otp">驗證碼</label>
          <input
            ref={otpRef}
            id="customer-email-verification-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            aria-invalid={Boolean(error)}
            aria-describedby={`customer-email-verification-otp-helper${error ? ' customer-email-verification-error' : ''}`}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
          />
          <p id="customer-email-verification-otp-helper">請輸入 6 位數驗證碼</p>
        </div> : null}

        {error ? <p id="customer-email-verification-error" className="customer-email-verification__error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />{error}
        </p> : null}
        {requestStatus ? <p className="customer-email-verification__status" role="status">{requestStatus}</p> : null}

        {step === 'otp' ? <button className="customer-email-verification__resend" type="button" disabled={pending} onClick={() => void requestCode(true)}>重新寄送驗證碼</button> : null}
        <footer className="customer-email-verification__actions">
          <button type="button" disabled={pending} onClick={close}>取消</button>
          {step === 'request' ? <button type="button" disabled={pending} onClick={() => void requestCode()}>{pending ? '寄送中' : '寄送驗證碼'}</button> : null}
          {step === 'otp' ? <button type="button" disabled={pending} onClick={() => void verifyCode()}>{pending ? '驗證中' : '完成驗證'}</button> : null}
          {step === 'refresh' ? <button type="button" disabled={pending} onClick={() => void refreshAuthoritativeState()}>{pending ? '重新載入中' : '重新載入'}</button> : null}
        </footer>
      </section>
    </div>,
    document.body
  );
}
