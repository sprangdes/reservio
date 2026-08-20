import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';

type AccountTypeChoiceProps = {
  selected: 'customer' | 'merchant';
  customerState?: unknown;
  merchantState?: unknown;
  onCustomerSelect?: () => void;
  onMerchantSelect?: () => void;
  disabled?: boolean;
};

export default function AccountTypeChoice({ selected, customerState, merchantState, onCustomerSelect, onMerchantSelect, disabled = false }: Readonly<AccountTypeChoiceProps>) {
  const handleCustomer = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onCustomerSelect?.();
  };
  const handleMerchant = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onMerchantSelect?.();
  };
  return <nav className="auth-account-type" aria-label="選擇帳號類型">
    {selected === 'customer'
      ? <span className="auth-account-type__option auth-account-type__option--selected" aria-current="page"><i className="bi bi-check-lg" aria-hidden="true" />我要預約服務<span className="visually-hidden">，目前選擇</span></span>
      : <Link className="auth-account-type__option" to="/register" state={customerState} onClick={handleCustomer} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}><i className="bi bi-person" aria-hidden="true" />我要預約服務</Link>}
    {selected === 'merchant'
      ? <span className="auth-account-type__option auth-account-type__option--selected auth-account-type__option--merchant" aria-current="page"><i className="bi bi-check-lg" aria-hidden="true" />我是商家<span className="visually-hidden">，目前選擇</span></span>
      : <Link className="auth-account-type__option auth-account-type__option--merchant" to="/register-business" state={merchantState} onClick={handleMerchant} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}><i className="bi bi-shop" aria-hidden="true" />我是商家</Link>}
  </nav>;
}
