import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastContextValue {
  successMessage: string;
  errorMessage: string;
  setSuccessMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const value = useMemo<ToastContextValue>(
    () => ({
      successMessage,
      errorMessage,
      setSuccessMessage,
      setErrorMessage
    }),
    [successMessage, errorMessage]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
