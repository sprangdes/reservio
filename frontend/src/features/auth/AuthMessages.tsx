type AuthMessageProps = {
  children: string;
  id?: string;
};

export function AuthErrorMessage({ children, id }: Readonly<AuthMessageProps>) {
  return <div className="auth-shell__error" id={id} role="alert">{children}</div>;
}

export function AuthStatusMessage({ children, id }: Readonly<AuthMessageProps>) {
  return <p className="auth-registration__pending" id={id} role="status" aria-live="polite">{children}</p>;
}
