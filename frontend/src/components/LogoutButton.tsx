import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { clearMerchantRegistrationDraft } from '../features/auth/merchantRegistrationDraft';
import { clearPasswordResetState } from '../features/auth/passwordResetState';
import { clearReturnContext } from '../features/auth/returnContext';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

type LogoutButtonProps = {
  className?: string;
  children?: ReactNode;
  onLoggedOut?: () => void;
};

export default function LogoutButton({ className, children = '登出', onLoggedOut }: Readonly<LogoutButtonProps>) {
  const { setMe } = useAuth();
  const { setErrorMessage } = useToast();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const logout = async () => {
    if (pending) return;
    setPending(true);
    try {
      await api.logout();
      clearReturnContext();
      clearPasswordResetState();
      clearMerchantRegistrationDraft();
      setMe(null);
      onLoggedOut?.();
      navigate('/login', { replace: true });
    } catch {
      setErrorMessage('目前無法完成登出，請確認網路連線後再試。');
      setPending(false);
    }
  };

  return <button type="button" className={className} disabled={pending} aria-busy={pending} onClick={() => void logout()}>{pending ? '登出中…' : children}</button>;
}
