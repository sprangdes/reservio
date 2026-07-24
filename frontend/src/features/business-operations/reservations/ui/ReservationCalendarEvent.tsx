import { getReservationStatusPresentation } from '../status';
import type { ReservationCalendarEvent } from '../types';

function eventTime(event: ReservationCalendarEvent) {
  const start = event.item.startTime.value?.slice(0, 5);
  const end = event.item.endTime.value?.slice(0, 5);
  return start && end ? `${start} – ${end}` : start || '時間未提供';
}

export default function ReservationCalendarEvent({ event, selected, onSelect, compact = false }: Readonly<{ event: ReservationCalendarEvent; selected: boolean; onSelect: (event: ReservationCalendarEvent) => void; compact?: boolean }>) {
  const status = getReservationStatusPresentation(event.item.backendStatus);
  const customer = event.item.customerName.value || '未提供顧客名稱';
  const service = event.item.serviceName.value || '未提供服務';
  return <button type="button" className={`reservation-calendar-event reservation-calendar-event--${status.tone}${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}`} onClick={() => onSelect(event)} aria-pressed={selected} aria-label={`${customer}，${service}，${eventTime(event)}，${status.label}`}><span className="reservation-calendar-event__time">{eventTime(event)}</span><strong>{customer}</strong><span>{service}</span><small><i className={`bi bi-${status.icon}`} aria-hidden="true" />{status.label}</small></button>;
}
