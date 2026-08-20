import React from 'react';
import { Dropdown, Toast } from 'bootstrap';
import flatpickr from 'flatpickr';
import { MandarinTraditional } from 'flatpickr/dist/l10n/zh-tw';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import 'flatpickr/dist/flatpickr.min.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './state/AuthContext';
import { ToastProvider } from './state/ToastContext';
import './styles.css';

(globalThis as any).bootstrap = { Dropdown, Toast };
(globalThis as any).flatpickr = flatpickr;
flatpickr.localize(MandarinTraditional);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
