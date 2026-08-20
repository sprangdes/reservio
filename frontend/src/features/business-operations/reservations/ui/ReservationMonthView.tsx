import { addCalendarDays, calendarMonthRange, calendarWeekRange } from '../calendar';
import type { ReservationCalendarEvent as CalendarEvent } from '../types';

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export default function ReservationMonthView({ selectedDate, events, onSelectDate }: Readonly<{ selectedDate: string; events: CalendarEvent[]; onSelectDate: (date: string) => void }>) {
  const range = calendarMonthRange(selectedDate);
  const visibleStart = calendarWeekRange(range.startDate).startDate;
  const month = range.startDate.slice(0, 7);
  const dates = Array.from({ length: 42 }, (_, index) => addCalendarDays(visibleStart, index));
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <section className="reservation-calendar__month" aria-label="月行事曆"><div className="reservation-calendar__month-head">{weekdays.map((weekday) => <span key={weekday}>週{weekday}</span>)}</div><div className="reservation-calendar__month-grid">{dates.map((date) => { const dayEvents = events.filter((event) => event.date === date); return <button key={date} type="button" className={`${date.slice(0, 7) === month ? '' : 'is-outside'}${date === selectedDate ? ' is-selected' : ''}${date === todayValue ? ' is-today' : ''}`} onClick={() => onSelectDate(date)} aria-label={`${date}，${dayEvents.length} 筆預約`}><strong>{date.slice(8)}</strong>{dayEvents.length ? <span>{dayEvents.length} 筆預約</span> : <small>無預約</small>}</button>; })}</div></section>;
}
