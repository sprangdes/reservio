import { useCallback, useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { useDirtyRegistrySnapshot, useDiscardAllSettingsForms } from '../state/SettingsDirtyRegistry';

export function navigationDecision({ dirty, pending }: Readonly<{ dirty: boolean; pending: boolean }>) { return pending ? 'block' : dirty ? 'confirm' : 'proceed'; }
export function useUnsavedChangesGuard() {
  const { dirty, pending } = useDirtyRegistrySnapshot(); const discardAll = useDiscardAllSettingsForms(); const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname && navigationDecision({ dirty, pending }) !== 'proceed'); const [processing, setProcessing] = useState(false);
  useEffect(() => { const onBeforeUnload = (event: BeforeUnloadEvent) => { if (!dirty && !pending) return; event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', onBeforeUnload); return () => window.removeEventListener('beforeunload', onBeforeUnload); }, [dirty, pending]);
  useEffect(() => { if (blocker.state === 'blocked' && !dirty && !pending) blocker.proceed?.(); }, [blocker, dirty, pending]);
  const cancel = useCallback(() => { if (blocker.state === 'blocked') blocker.reset(); }, [blocker]);
  const discard = useCallback(() => { if (blocker.state !== 'blocked' || processing) return; setProcessing(true); discardAll(); blocker.proceed?.(); }, [blocker, discardAll, processing]);
  useEffect(() => { if (blocker.state === 'unblocked') setProcessing(false); }, [blocker.state]);
  return { dialog: blocker.state === 'blocked' && !pending ? <UnsavedChangesDialog pending={processing} onCancel={cancel} onDiscard={discard} /> : null, blocked: blocker.state === 'blocked', pending };
}
