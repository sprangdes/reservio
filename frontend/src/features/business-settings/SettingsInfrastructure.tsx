import type { ReactNode } from 'react';
import { SettingsDirtyRegistryProvider } from './state/SettingsDirtyRegistry';
import { useUnsavedChangesGuard } from './hooks/useUnsavedChangesGuard';
function Guard() { const { dialog } = useUnsavedChangesGuard(); return dialog; }
export default function SettingsInfrastructure({ children }: Readonly<{ children: ReactNode }>) { return <SettingsDirtyRegistryProvider><Guard />{children}</SettingsDirtyRegistryProvider>; }
