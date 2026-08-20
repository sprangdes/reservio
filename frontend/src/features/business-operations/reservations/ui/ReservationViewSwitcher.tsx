import { Link } from 'react-router-dom';
import { getReservationRouteForPreset } from '../routePresets';
import type { ReservationViewPreset } from '../types';

const options: Array<{ preset: Exclude<ReservationViewPreset, 'calendar'>; label: string }> = [{ preset: 'today', label: '今天' }, { preset: 'pending', label: '待處理' }, { preset: 'all', label: '全部' }];

export default function ReservationViewSwitcher({ preset, calendarOpen, onCalendar }: Readonly<{ preset: Exclude<ReservationViewPreset, 'calendar'>; calendarOpen: boolean; onCalendar: () => void }>) {
  return <nav className="reservation-center-ui__view-switcher" aria-label="預約中心檢視">{options.map((option) => <Link key={option.preset} to={getReservationRouteForPreset(option.preset)} className={preset === option.preset && !calendarOpen ? 'is-active' : ''} aria-current={preset === option.preset && !calendarOpen ? 'page' : undefined}>{option.label}</Link>)}<button type="button" className={calendarOpen ? 'is-active' : ''} onClick={onCalendar} aria-pressed={calendarOpen}><i className="bi bi-calendar3" aria-hidden="true" />行事曆</button></nav>;
}
