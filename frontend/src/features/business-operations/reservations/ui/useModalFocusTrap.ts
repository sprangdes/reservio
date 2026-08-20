import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalFocusTrap<T extends HTMLElement>(initialFocus?: RefObject<HTMLElement | null>) {
  const containerRef = useRef<T>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = initialFocus?.current || containerRef.current?.querySelector<HTMLElement>(focusableSelector);
    focusTarget?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !containerRef.current) return;
      const elements = Array.from(containerRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); openerRef.current?.focus(); };
  }, [initialFocus]);
  return containerRef;
}
