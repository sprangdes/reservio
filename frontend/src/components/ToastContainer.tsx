import { useEffect, useRef } from 'react';
import { useToast } from '../state/ToastContext';

export default function ToastContainer() {
  const { successMessage, errorMessage, setSuccessMessage, setErrorMessage } = useToast();
  const successRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = successRef.current;
    if (!successMessage || !element || !(globalThis as any).bootstrap) return;
    const clearMessage = () => setSuccessMessage('');
    element.addEventListener('hidden.bs.toast', clearMessage, { once: true });
    const toast = (globalThis as any).bootstrap.Toast.getOrCreateInstance(element);
    toast.show();
    return () => element.removeEventListener('hidden.bs.toast', clearMessage);
  }, [setSuccessMessage, successMessage]);

  useEffect(() => {
    const element = errorRef.current;
    if (!errorMessage || !element || !(globalThis as any).bootstrap) return;
    const clearMessage = () => setErrorMessage('');
    element.addEventListener('hidden.bs.toast', clearMessage, { once: true });
    const toast = (globalThis as any).bootstrap.Toast.getOrCreateInstance(element);
    toast.show();
    return () => element.removeEventListener('hidden.bs.toast', clearMessage);
  }, [errorMessage, setErrorMessage]);

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      {successMessage ? (
        <div ref={successRef} id="successToast" className="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="d-flex">
            <div className="toast-body">
              <i className="bi bi-check-circle-fill me-2"></i>
              <span>{successMessage}</span>
            </div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onClick={() => setSuccessMessage('')}></button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div ref={errorRef} id="errorToast" className="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="d-flex">
            <div className="toast-body">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <span>{errorMessage}</span>
            </div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onClick={() => setErrorMessage('')}></button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
