import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_FOCUS_TIMEOUT_MS = 3000;

export default function RouteFocusManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    let frame = 0;
    let timeout = 0;
    let observer: MutationObserver | null = null;
    const focusHeading = (): boolean => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (!heading) return false;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      const title = heading.textContent?.trim();
      document.title = title ? `${title}｜Reservio` : 'Reservio';
      return true;
    };
    frame = globalThis.requestAnimationFrame(() => {
      if (focusHeading()) return;
      observer = new MutationObserver(() => {
        if (focusHeading()) observer?.disconnect();
      });
      observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
      timeout = globalThis.setTimeout(() => observer?.disconnect(), ROUTE_FOCUS_TIMEOUT_MS);
    });
    return () => {
      globalThis.cancelAnimationFrame(frame);
      globalThis.clearTimeout(timeout);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
