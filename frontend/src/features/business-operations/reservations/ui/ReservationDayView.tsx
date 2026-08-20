import { layoutCalendarEvents } from '../calendar';
import ReservationAgenda from './ReservationAgenda';
import ReservationCalendarEvent from './ReservationCalendarEvent';
import type { ReservationCalendarEvent as CalendarEvent } from '../types';

const startHour = 8;
const endHour = 20;

export default function ReservationDayView({ events, selectedId, onSelect, nowMinutes, showCurrentTime }: Readonly<{ events: CalendarEvent[]; selectedId?: string | number; onSelect: (event: CalendarEvent) => void; nowMinutes: number; showCurrentTime: boolean }>) {
  const layouts = layoutCalendarEvents(events);
  return <><section className="reservation-calendar__day" aria-label="日行事曆"><div className="reservation-calendar__time-axis" aria-hidden="true">{Array.from({ length: endHour - startHour + 1 }, (_, index) => <span key={index}>{String(startHour + index).padStart(2, '0')}:00</span>)}</div><div className="reservation-calendar__day-grid">{Array.from({ length: endHour - startHour }, (_, index) => <span key={index} />)}{showCurrentTime && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60 ? <span className="reservation-calendar__now-line" style={{ top: `${((nowMinutes - startHour * 60) / ((endHour - startHour) * 60)) * 100}%` }}><b>現在</b></span> : null}{layouts.map(({ event, column, columns }) => { const start = Math.max(event.startMinutes || 0, startHour * 60); const end = Math.min(event.endMinutes ?? start + 15, endHour * 60); const top = ((start - startHour * 60) / ((endHour - startHour) * 60)) * 100; const height = Math.max(((end - start) / ((endHour - startHour) * 60)) * 100, 3.8); return <div key={event.id} className="reservation-calendar__positioned-event" style={{ top: `${top}%`, height: `${height}%`, left: `calc(${(column / columns) * 100}% + .35rem)`, width: `calc(${100 / columns}% - .7rem)` }}><ReservationCalendarEvent event={event} selected={String(selectedId) === String(event.id)} onSelect={onSelect} compact={height < 7} /></div>; })}{!events.length ? <p className="reservation-calendar__open-range">此時段目前沒有預約資料。</p> : null}</div></section><ReservationAgenda events={events} selectedId={selectedId} onSelect={onSelect} nowMinutes={nowMinutes} showCurrentTime={showCurrentTime} /></>;
}
