import { createReservationStatusTimeline, formatTimestampToSeconds } from '../details';
import { getReservationStatusPresentation } from '../status';
import ReservationStatusBadge from './ReservationStatusBadge';
import type { FieldValue, ReservationCenterItem } from '../types';

function present(value: FieldValue<string | number>, fallback = '未提供') { return value.value === undefined || value.value === '' ? fallback : String(value.value); }
function DetailRow({ label, value }: Readonly<{ label: string; value: FieldValue<string | number> }>) { return <div className="reservation-details__row"><dt>{label}</dt><dd>{present(value)}</dd></div>; }

export function ReservationDetailsHeader({ item }: Readonly<{ item: ReservationCenterItem }>) {
  const status = getReservationStatusPresentation(item.backendStatus);
  return <header className="reservation-details__header"><div><p>預約詳情</p><h2 id="reservation-details-title">{item.customerName.value || '未提供顧客名稱'}</h2>{item.id !== '' ? <span>預約編號 #{item.id}</span> : null}</div><ReservationStatusBadge item={item} /><span className="visually-hidden">目前狀態：{status.label}</span></header>;
}

export function ReservationCustomerSection({ item }: Readonly<{ item: ReservationCenterItem }>) {
  return <section className="reservation-details__section" aria-labelledby="reservation-details-customer"><h3 id="reservation-details-customer"><i className="bi bi-person" aria-hidden="true" />顧客</h3><dl><DetailRow label="顧客姓名" value={item.customerName} />{item.customerPhone.availability !== 'unsupported' ? <DetailRow label="聯絡電話" value={item.customerPhone} /> : null}</dl></section>;
}

export function ReservationServiceSection({ item }: Readonly<{ item: ReservationCenterItem }>) {
  return <section className="reservation-details__section" aria-labelledby="reservation-details-service"><h3 id="reservation-details-service"><i className="bi bi-tag" aria-hidden="true" />服務</h3><dl><DetailRow label="服務項目" value={item.serviceName} />{item.staffOrResource.availability !== 'unsupported' ? <DetailRow label="服務人員或資源" value={item.staffOrResource} /> : null}</dl></section>;
}

export function ReservationTimeSection({ item }: Readonly<{ item: ReservationCenterItem }>) {
  const time: FieldValue<string> = item.startTime.value || item.endTime.value ? { value: `${item.startTime.value?.slice(0, 5) || '未提供'} – ${item.endTime.value?.slice(0, 5) || '未提供'}`, availability: 'derived' } : { availability: 'unsupported' };
  const toSecondPrecision = (value: FieldValue<string>): FieldValue<string> => value.value ? { ...value, value: formatTimestampToSeconds(value.value) } : value;
  return <section className="reservation-details__section" aria-labelledby="reservation-details-time"><h3 id="reservation-details-time"><i className="bi bi-calendar3" aria-hidden="true" />日期與時間</h3><dl><DetailRow label="預約日期" value={item.reservationDate} /><DetailRow label="預約時間" value={time} /><DetailRow label="時長" value={item.durationMinutes.value ? { value: `${item.durationMinutes.value} 分鐘`, availability: item.durationMinutes.availability } : item.durationMinutes} />{item.createdAt.availability !== 'unsupported' ? <DetailRow label="建立時間" value={toSecondPrecision(item.createdAt)} /> : null}{item.updatedAt.availability !== 'unsupported' ? <DetailRow label="更新時間" value={toSecondPrecision(item.updatedAt)} /> : null}</dl></section>;
}

export function ReservationRemarkSection({ item }: Readonly<{ item: ReservationCenterItem }>) {
  if (!item.remark.value) return null;
  return <section className="reservation-details__section" aria-labelledby="reservation-details-remark"><h3 id="reservation-details-remark"><i className="bi bi-card-text" aria-hidden="true" />備註</h3><p className="reservation-details__remark">{item.remark.value}</p></section>;
}

export function ReservationReasonSection({ item }: Readonly<{ item: ReservationCenterItem }>) {
  const status = getReservationStatusPresentation(item.backendStatus);
  if (status.key !== 'CANCEL_REQUESTED' && status.key !== 'CANCELLED') return null;
  if (!item.cancellationReason.value) return null;
  return <section className="reservation-details__section reservation-details__reason" aria-labelledby="reservation-details-reason"><h3 id="reservation-details-reason"><i className="bi bi-chat-square-text" aria-hidden="true" />顧客取消原因</h3><p>{item.cancellationReason.value}</p></section>;
}

export function ReservationStatusTimeline({ item }: Readonly<{ item: ReservationCenterItem }>) {
  const entries = createReservationStatusTimeline(item);
  return <section className="reservation-details__section" aria-labelledby="reservation-details-timeline"><h3 id="reservation-details-timeline"><i className="bi bi-clock-history" aria-hidden="true" />目前狀態摘要</h3><p className="reservation-details__timeline-note">此為依目前資料推得的摘要，並非完整異動紀錄。</p><ol className="reservation-details__timeline">{entries.map((entry) => <li key={entry.key} className={entry.current ? 'is-current' : ''}><i className={`bi ${entry.current ? 'bi-record-circle' : 'bi-circle-fill'}`} aria-hidden="true" /><div><strong>{entry.label}</strong>{entry.timestamp ? <span>{formatTimestampToSeconds(entry.timestamp)}</span> : null}</div></li>)}</ol></section>;
}

export default function ReservationDetailsContent({ item }: Readonly<{ item: ReservationCenterItem }>) {
  return <div className="reservation-details__content"><ReservationDetailsHeader item={item} />{item.detailsAvailability !== 'complete' ? <p className="reservation-details__partial" role="status"><i className="bi bi-info-circle" aria-hidden="true" />目前僅提供清單資料摘要。</p> : null}<ReservationCustomerSection item={item} /><ReservationServiceSection item={item} /><ReservationTimeSection item={item} /><ReservationRemarkSection item={item} /><ReservationReasonSection item={item} /><ReservationStatusTimeline item={item} /></div>;
}
