import type { ReactNode } from 'react';
export default function SettingsStatusRow({ icon = 'bi-info-circle', label, children }: Readonly<{ icon?: string; label: string; children: ReactNode }>) { return <div className="business-settings__status-row"><i className={`bi ${icon}`} aria-hidden="true" /><span><strong>{label}</strong><small>{children}</small></span></div>; }
