import { formatCalendarRange, navigateCalendarDate } from '../calendar';
import { localDate } from '../query';
import type { ReservationCalendarViewMode } from '../types';

const modes: Array<{ value: ReservationCalendarViewMode; label: string }> = [{ value: 'day', label: '日' }, { value: 'week', label: '週' }, { value: 'month', label: '月' }];

export default function ReservationCalendarControls({ selectedDate, mode, onDate, onMode }: Readonly<{ selectedDate: string; mode: ReservationCalendarViewMode; onDate: (value: string) => void; onMode: (value: ReservationCalendarViewMode) => void }>) {
  return <header className="reservation-calendar__controls"><div className="reservation-calendar__date-navigation" aria-label="行事曆日期"><button type="button" aria-label="上一個日期範圍" onClick={() => onDate(navigateCalendarDate(selectedDate, mode, -1))}><i className="bi bi-chevron-left" aria-hidden="true" /></button><strong>{formatCalendarRange(selectedDate, mode)}</strong><button type="button" onClick={() => onDate(localDate())}>今天</button><button type="button" aria-label="下一個日期範圍" onClick={() => onDate(navigateCalendarDate(selectedDate, mode, 1))}><i className="bi bi-chevron-right" aria-hidden="true" /></button></div><div className="reservation-calendar__mode-switcher" role="group" aria-label="行事曆檢視模式">{modes.map((entry) => <button key={entry.value} type="button" className={mode === entry.value ? 'is-active' : ''} aria-pressed={mode === entry.value} onClick={() => onMode(entry.value)}>{entry.label}</button>)}</div></header>;
}
