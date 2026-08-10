import { useId, useState } from 'react';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: 'current' | 'new';
  autoComplete?: string;
  error?: string;
  describedBy?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
};

export default function PasswordField({ id, label, value, onChange, mode, autoComplete, error, describedBy, disabled = false, placeholder, required = false }: Readonly<PasswordFieldProps>) {
  const [visible, setVisible] = useState(false);
  const generatedErrorId = useId();
  const errorId = error ? `${id}-${generatedErrorId}` : undefined;
  const descriptions = [describedBy, errorId].filter(Boolean).join(' ') || undefined;
  const toggleLabel = visible ? '隱藏密碼' : '顯示密碼';

  return <div className="mb-3">
    <label htmlFor={id} className="form-label">{label}</label>
    <div className="input-group">
      <input id={id} type={visible ? 'text' : 'password'} className={`form-control${error ? ' is-invalid' : ''}`} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete || (mode === 'current' ? 'current-password' : 'new-password')} aria-describedby={descriptions} aria-invalid={Boolean(error)} disabled={disabled} placeholder={placeholder} required={required} />
      <button type="button" className="btn btn-outline-secondary" onClick={() => setVisible((current) => !current)} aria-label={toggleLabel} aria-pressed={visible} disabled={disabled} style={{ minWidth: 44, minHeight: 44 }}>
        <i className={`bi ${visible ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
      </button>
    </div>
    {error ? <div id={errorId} className="invalid-feedback d-block">{error}</div> : null}
  </div>;
}
