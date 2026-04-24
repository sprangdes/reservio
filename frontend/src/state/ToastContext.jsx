import { createContext, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const ToastContext = createContext(null);

export function ToastProvider(props) {
  const { children } = props;
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

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useToast() {
  return useContext(ToastContext);
}
