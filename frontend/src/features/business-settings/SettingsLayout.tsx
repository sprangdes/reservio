import type { ReactNode } from 'react';
import SettingsSecondaryNavigation from './SettingsSecondaryNavigation';
import SettingsInfrastructure from './SettingsInfrastructure';

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SettingsInfrastructure><div className="business-settings"><SettingsSecondaryNavigation /><div className="business-settings__content">{children}</div></div></SettingsInfrastructure>;
}
