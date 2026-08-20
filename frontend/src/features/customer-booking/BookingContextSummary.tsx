import { formatLocalDateZhTw, formatLocalTimeRange } from './bookingDates';
import type { BookingDraft } from './domain';

export function BookingContextSummary({ draft }: Readonly<{ draft: BookingDraft }>) {
  const date = draft.date ? formatLocalDateZhTw(draft.date) : null;
  const time = draft.startTime && draft.estimatedEndTime ? formatLocalTimeRange(draft.startTime, draft.estimatedEndTime) : null;
  return <aside className="booking-flow__summary" aria-label="預約摘要">
    <h2>你的預約</h2>
    <dl>
      <div><dt><i className="bi bi-shop" aria-hidden="true" />店家</dt><dd>{draft.business?.name || '尚未選擇'}</dd></div>
      <div><dt><i className="bi bi-scissors" aria-hidden="true" />服務</dt><dd>{draft.service?.name || '尚未選擇'}</dd></div>
      <div><dt><i className="bi bi-clock" aria-hidden="true" />時長</dt><dd>{draft.service ? `${draft.service.durationMinutes} 分鐘` : '尚未選擇'}</dd></div>
      <div><dt><i className="bi bi-calendar3" aria-hidden="true" />日期</dt><dd>{date || '尚未選擇'}</dd></div>
      <div><dt><i className="bi bi-clock-history" aria-hidden="true" />時間</dt><dd>{time || '尚未選擇'}</dd></div>
    </dl>
  </aside>;
}
