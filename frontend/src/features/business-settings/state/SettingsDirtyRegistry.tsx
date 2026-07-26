import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { SettingsFormKey } from '../types';

export type DirtyRegistration = { dirty: boolean; pending: boolean; discard: () => void };
export class SettingsDirtyRegistry {
  private forms = new Map<SettingsFormKey, DirtyRegistration>();
  private listeners = new Set<() => void>();
  private currentSnapshot = { dirty: false, pending: false, count: 0 };
  private emit() { this.currentSnapshot = { dirty: [...this.forms.values()].some((form) => form.dirty), pending: [...this.forms.values()].some((form) => form.pending), count: this.forms.size }; this.listeners.forEach((listener) => listener()); }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  register(key: SettingsFormKey, registration: DirtyRegistration) { this.forms.set(key, registration); this.emit(); return () => { if (this.forms.delete(key)) this.emit(); }; }
  update(key: SettingsFormKey, registration: DirtyRegistration) { if (!this.forms.has(key)) return; this.forms.set(key, registration); this.emit(); }
  snapshot = () => this.currentSnapshot;
  discardAll() { this.forms.forEach((form) => form.discard()); this.emit(); }
  reset() { this.forms.clear(); this.emit(); }
}

const SettingsDirtyRegistryContext = createContext<SettingsDirtyRegistry | null>(null);
export function SettingsDirtyRegistryProvider({ children }: Readonly<{ children: ReactNode }>) { const registryRef = useRef<SettingsDirtyRegistry | null>(null); if (!registryRef.current) registryRef.current = new SettingsDirtyRegistry(); return <SettingsDirtyRegistryContext.Provider value={registryRef.current}>{children}</SettingsDirtyRegistryContext.Provider>; }
export function useSettingsDirtyRegistry() { const registry = useContext(SettingsDirtyRegistryContext); if (!registry) throw new Error('useSettingsDirtyRegistry must be used within SettingsDirtyRegistryProvider'); return registry; }
export function useDirtyRegistrySnapshot() { const registry = useSettingsDirtyRegistry(); return useSyncExternalStore(registry.subscribe, registry.snapshot, registry.snapshot); }
export function useRegisterDirtyForm(key: SettingsFormKey, dirty: boolean, pending: boolean, discard: () => void) { const registry = useSettingsDirtyRegistry(); const discardRef = useRef(discard); discardRef.current = discard; useEffect(() => registry.register(key, { dirty, pending, discard: () => discardRef.current() }), [key, registry]); useEffect(() => { registry.update(key, { dirty, pending, discard: () => discardRef.current() }); }, [dirty, key, pending, registry]); }
export function useDiscardAllSettingsForms() { const registry = useSettingsDirtyRegistry(); return useCallback(() => registry.discardAll(), [registry]); }
