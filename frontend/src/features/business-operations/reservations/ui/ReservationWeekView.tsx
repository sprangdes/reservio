import { addCalendarDays, calendarWeekRange, layoutCalendarEvents } from '../calendar';
import ReservationCalendarEvent from './ReservationCalendarEvent';
import type { ReservationCalendarEvent as CalendarEvent } from '../types';

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
const startHour = 8;
const endHour = 20;

export default function ReservationWeekView({ selectedDate, events, selectedId, onSelect, nowMinutes }: Readonly<{ selectedDate: string; events: CalendarEvent[]; selectedId?: string | number; onSelect: (event: CalendarEvent) => void; nowMinutes: number }>) {
  const range = calendarWeekRange(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(range.startDate, index));
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <section className="reservation-calendar__week" aria-label="週行事曆"><div className="reservation-calendar__week-inner"><div className="reservation-calendar__week-head"><span aria-hidden="true" />{days.map((date, index) => <strong key={date} className={date === todayValue ? 'is-today' : ''}>週{weekdayLabels[index]}<b>{date.slice(5).replace('-', '/')}</b></strong>)}</div><div className="reservation-calendar__week-body"><div className="reservation-calendar__time-axis" aria-hidden="true">{Array.from({ length: endHour - startHour + 1 }, (_, index) => <span key={index}>{String(startHour + index).padStart(2, '0')}:00</span>)}</div>{days.map((date) => { const eventsForDate = events.filter((event) => event.date === date); const layouts = layoutCalendarEvents(eventsForDate); const showNow = date === todayValue && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60; return <div key={date} className="reservation-calendar__week-day">{Array.from({ length: endHour - startHour }, (_, index) => <span key={index} />)}{showNow ? <span className="reservation-calendar__now-line" style={{ top: `${((nowMinutes - startHour * 60) / ((endHour - startHour) * 60)) * 100}%` }} /> : null}{layouts.map(({ event, column, columns }) => { const start = Math.max(event.startMinutes || 0, startHour * 60); const end = Math.min(event.endMinutes ?? start + 15, endHour * 60); const top = ((start - startHour * 60) / ((endHour - startHour) * 60)) * 100; const height = Math.max(((end - start) / ((endHour - startHour) * 60)) * 100, 4.2); return <div key={event.id} className="reservation-calendar__positioned-event" style={{ top: `${top}%`, height: `${height}%`, left: `calc(${(column / columns) * 100}% + .2rem)`, width: `calc(${100 / columns}% - .4rem)` }}><ReservationCalendarEvent event={event} selected={String(selectedId) === String(event.id)} onSelect={onSelect} compact /></div>; })}</div>; })}</div></div></section>;
}
