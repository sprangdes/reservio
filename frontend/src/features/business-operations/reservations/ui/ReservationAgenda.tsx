import ReservationCalendarEvent from './ReservationCalendarEvent';
import type { ReservationCalendarEvent as CalendarEvent } from '../types';

export default function ReservationAgenda({ events, selectedId, onSelect, nowMinutes, showCurrentTime }: Readonly<{ events: CalendarEvent[]; selectedId?: string | number; onSelect: (event: CalendarEvent) => void; nowMinutes: number; showCurrentTime: boolean }>) {
  const sorted = events.slice().sort((left, right) => (left.startMinutes ?? 1441) - (right.startMinutes ?? 1441));
  return <section className="reservation-calendar__agenda" aria-label="當日預約日程"><div className="reservation-calendar__agenda-axis" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index}>{String(index + 8).padStart(2, '0')}:00</span>)}</div><div className="reservation-calendar__agenda-events">{showCurrentTime && nowMinutes >= 480 && nowMinutes <= 1200 ? <span className="reservation-calendar__now-line reservation-calendar__now-line--agenda" style={{ top: `${((nowMinutes - 480) / 720) * 100}%` }}><b>現在</b></span> : null}{sorted.length ? sorted.map((event) => <ReservationCalendarEvent key={event.id} event={event} selected={String(selectedId) === String(event.id)} onSelect={onSelect} />) : <p>此日期目前沒有預約資料。</p>}</div></section>;
}
