import type { ReactNode } from 'react';
import SettingsSecondaryNavigation from './SettingsSecondaryNavigation';

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="business-settings"><SettingsSecondaryNavigation /><div className="business-settings__content">{children}</div></div>;
}
