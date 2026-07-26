import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { useDirtyRegistrySnapshot, useDiscardAllSettingsForms } from '../state/SettingsDirtyRegistry';

export function navigationDecision({ dirty, pending }: Readonly<{ dirty: boolean; pending: boolean }>) { return pending ? 'block' : dirty ? 'confirm' : 'proceed'; }
export function useUnsavedChangesGuard() {
  const { dirty, pending } = useDirtyRegistrySnapshot(); const discardAll = useDiscardAllSettingsForms(); const navigate = useNavigate(); const [processing, setProcessing] = useState(false); const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => { const onBeforeUnload = (event: BeforeUnloadEvent) => { if (!dirty && !pending) return; event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', onBeforeUnload); return () => window.removeEventListener('beforeunload', onBeforeUnload); }, [dirty, pending]);
  useEffect(() => { const onClick = (event: MouseEvent) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]'); if (!anchor || anchor.target || anchor.hasAttribute('download')) return; const target = new URL(anchor.href, window.location.href); if (target.origin !== window.location.origin || target.pathname === window.location.pathname) return; if (navigationDecision({ dirty, pending }) === 'proceed') return; event.preventDefault(); event.stopPropagation(); if (!pending) setDestination(`${target.pathname}${target.search}${target.hash}`); }; document.addEventListener('click', onClick, true); return () => document.removeEventListener('click', onClick, true); }, [dirty, pending]);
  const cancel = useCallback(() => setDestination(null), []);
  const discard = useCallback(() => { if (!destination || processing) return; setProcessing(true); discardAll(); const next = destination; setDestination(null); navigate(next); }, [destination, discardAll, navigate, processing]);
  useEffect(() => { if (!destination) setProcessing(false); }, [destination]);
  return { dialog: destination && !pending ? <UnsavedChangesDialog pending={processing} onCancel={cancel} onDiscard={discard} /> : null, blocked: Boolean(destination), pending };
}
