import { Link } from 'react-router-dom';

export default function FocusedSettingsHeader({ parentDestination, parentLabel, title }: Readonly<{ parentDestination: string; parentLabel: string; title: string }>) {
  return <header className="business-settings__focused-header">
    <Link to={parentDestination} aria-label={`返回${parentLabel}`}><i className="bi bi-arrow-left" aria-hidden="true" /><span>{parentLabel}</span></Link>
    <strong>{title}</strong>
    <span aria-hidden="true" />
  </header>;
}
