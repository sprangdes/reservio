import { useId } from 'react';

type OtpInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  describedBy?: string;
  disabled?: boolean;
};

export function sanitizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export default function OtpInput({ id, value, onChange, error, describedBy, disabled = false }: Readonly<OtpInputProps>) {
  const generatedErrorId = useId();
  const normalized = sanitizeOtp(value);
  const activeIndex = Math.min(normalized.length, 5);
  const errorId = error ? (describedBy || `${id}-${generatedErrorId}`) : undefined;

  return <div className="auth-recovery__otp-field">
    <label htmlFor={id}>驗證碼</label>
    <div className={`auth-recovery__otp${error ? ' auth-recovery__otp--invalid' : ''}`}>
      <input
        id={id}
        className="auth-recovery__otp-input"
        type="text"
        value={normalized}
        onChange={(event) => onChange(sanitizeOtp(event.target.value))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        aria-label="驗證碼"
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        disabled={disabled}
      />
      <div className="auth-recovery__otp-segments" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={index === activeIndex && !disabled ? 'is-active' : undefined}>{normalized[index] || ''}</span>)}
      </div>
    </div>
    {error ? <p className="auth-recovery__field-error" id={errorId}>{error}</p> : null}
  </div>;
}
