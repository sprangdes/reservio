import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { SESSION_ACTIVITY_EVENT, SESSION_EXPIRED_EVENT, isUnauthorizedError } from '../sessionEvents';
import { buildLoginPath } from '../features/auth/authDestination';
import { clearMerchantRegistrationDraft } from '../features/auth/merchantRegistrationDraft';
import { clearPasswordResetState } from '../features/auth/passwordResetState';
import { clearReturnContext } from '../features/auth/returnContext';

const DEFAULT_TIMEOUT_SECONDS = 1800;
const DEFAULT_WARNING_SECONDS = 60;

interface SessionConfig {
  timeoutSeconds: number;
  warningSeconds: number;
}

export default function SessionTimeoutManager() {
  const { me, setMe } = useAuth();
  const { setErrorMessage } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [config, setConfig] = useState<SessionConfig>({
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    warningSeconds: DEFAULT_WARNING_SECONDS
  });
  const [showWarning, setShowWarning] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const warningTimerRef = useRef<number | null>(null);
  const expireTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      globalThis.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (expireTimerRef.current) {
      globalThis.clearTimeout(expireTimerRef.current);
      expireTimerRef.current = null;
    }
  }, []);

  const expireSession = useCallback((message = '登入已逾時，請重新登入。') => {
    clearTimers();
    setShowWarning(false);
    clearReturnContext();
    clearPasswordResetState();
    clearMerchantRegistrationDraft();
    setMe(null);
    setErrorMessage(message);
    if (location.pathname !== '/login') {
      navigate(buildLoginPath(location.pathname, location.search), { replace: true });
    }
  }, [clearTimers, location.pathname, location.search, navigate, setErrorMessage, setMe]);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    if (!me) return;

    const now = Date.now();
    const expiresAt = lastActivityRef.current + config.timeoutSeconds * 1000;
    const warningAt = expiresAt - config.warningSeconds * 1000;
    const warningDelay = Math.max(warningAt - now, 0);
    const expireDelay = Math.max(expiresAt - now, 0);

    warningTimerRef.current = globalThis.setTimeout(() => {
      setShowWarning(true);
    }, warningDelay);

    expireTimerRef.current = globalThis.setTimeout(() => {
      expireSession();
    }, expireDelay);
  }, [clearTimers, config.timeoutSeconds, config.warningSeconds, expireSession, me]);

  const recordActivity = useCallback(() => {
    if (!me) return;
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    scheduleTimers();
  }, [me, scheduleTimers]);

  useEffect(() => {
    if (!me) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    void (async () => {
      try {
        const res = await api.session();
        const data = res?.data || {};
        setConfig({
          timeoutSeconds: Number(data.timeoutSeconds) || DEFAULT_TIMEOUT_SECONDS,
          warningSeconds: Number(data.warningSeconds) || DEFAULT_WARNING_SECONDS
        });
      } catch {
        setConfig({
          timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
          warningSeconds: DEFAULT_WARNING_SECONDS
        });
      }
    })();
  }, [clearTimers, me]);

  useEffect(() => {
    if (!me) return;
    scheduleTimers();
  }, [config, me, scheduleTimers]);

  useEffect(() => {
    const handleActivity = () => recordActivity();
    const handleExpired = () => {
      if (me) {
        expireSession();
      }
    };

    globalThis.addEventListener(SESSION_ACTIVITY_EVENT, handleActivity);
    globalThis.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => {
      globalThis.removeEventListener(SESSION_ACTIVITY_EVENT, handleActivity);
      globalThis.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, [expireSession, me, recordActivity]);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!showWarning) return;
    const layer = layerRef.current;
    const parent = layer?.parentElement;
    const siblings = layer && parent
      ? Array.from(parent.children).filter((element): element is HTMLElement => element !== layer && element instanceof HTMLElement)
      : [];
    const previous = siblings.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }));
    siblings.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    continueRef.current?.focus();
    const focusable = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusable));
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    globalThis.addEventListener('keydown', trapFocus);
    return () => {
      globalThis.removeEventListener('keydown', trapFocus);
      previous.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
    };
  }, [showWarning]);

  const continueSession = async () => {
    try {
      await api.me();
      recordActivity();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        expireSession();
        return;
      }
      setErrorMessage('目前無法延長登入狀態，請稍後再試。');
    }
  };

  const logoutNow = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await api.logout();
      expireSession('您已登出。');
    } catch {
      setErrorMessage('目前無法完成登出，請確認網路連線後再試。');
      setLogoutPending(false);
    }
  };

  if (!me || !showWarning) {
    return null;
  }

  return (
    <>
      <div ref={layerRef} className="modal fade show session-timeout-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="session-timeout-title" aria-describedby="session-timeout-description">
        <div className="modal-dialog modal-dialog-centered">
          <div ref={dialogRef} className="modal-content">
            <div className="modal-header">
              <h2 id="session-timeout-title" className="modal-title h5 fw-bold">系統即將登出</h2>
            </div>
            <div className="modal-body">
              <p id="session-timeout-description" className="mb-0">您的登入狀態即將逾時。若要繼續使用，請延長登入狀態。</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" disabled={logoutPending} onClick={() => void logoutNow()}>
                {logoutPending ? '登出中…' : '立即登出'}
              </button>
              <button ref={continueRef} type="button" className="btn btn-gradient fw-bold" disabled={logoutPending} onClick={continueSession}>
                繼續使用
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
