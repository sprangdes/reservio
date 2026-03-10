import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const value = useMemo(() => ({
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage
  }), [successMessage, errorMessage]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
