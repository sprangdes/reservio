import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AuthShellProps = {
  title: string;
  description?: string;
  status?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'wide';
};

export default function AuthShell({ title, description, status, children, footer, variant = 'default' }: Readonly<AuthShellProps>) {
  return <div className="auth-shell">
    <header className="auth-shell__header">
      <Link className="auth-shell__brand" to="/" aria-label="Reservio 首頁">Reservio</Link>
      <Link className="auth-shell__back" to="/"><i className="bi bi-arrow-left" aria-hidden="true" /> 返回首頁</Link>
    </header>
    <main className="auth-shell__main" id="main-content">
      <section className={`auth-shell__surface${variant === 'wide' ? ' auth-shell__surface--wide' : ''}`} aria-labelledby="auth-shell-title">
        <h1 id="auth-shell-title" tabIndex={-1}>{title}</h1>
        {description ? <p className="auth-shell__description">{description}</p> : null}
        {status ? <div className="auth-shell__context">{status}</div> : null}
        {children}
        {footer ? <footer className="auth-shell__footer">{footer}</footer> : null}
      </section>
    </main>
  </div>;
}
