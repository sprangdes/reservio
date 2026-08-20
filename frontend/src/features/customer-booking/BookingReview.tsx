import type { RefObject } from 'react';
import { formatLocalDateZhTw, formatLocalTimeRange } from './bookingDates';
import type { BookingDraft } from './domain';

type Props = Readonly<{
  draft: BookingDraft;
  submitError: string | null;
  submitting: boolean;
  onRemarkChange: (remark: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  submitErrorRef: RefObject<HTMLDivElement | null>;
}>; 

export function BookingReview({ draft, submitError, submitting, onRemarkChange, headingRef, submitErrorRef }: Props) {
  const date = draft.date ? formatLocalDateZhTw(draft.date) : '';
  const time = draft.startTime && draft.estimatedEndTime ? formatLocalTimeRange(draft.startTime, draft.estimatedEndTime) : '';

  return <>
    <header className="booking-flow__heading">
      <h1 ref={headingRef} tabIndex={-1}>確認預約</h1>
      <p>請確認以下預約資訊。</p>
    </header>
    <section className="booking-flow__review" aria-label="預約確認資訊">
      <div className="booking-flow__review-time">
        <i className="bi bi-calendar3" aria-hidden="true" />
        <div><span>{date}</span><strong>{time}</strong></div>
      </div>
      <p className="booking-flow__review-context">{draft.business?.name} · {draft.service?.name} · {draft.service?.durationMinutes} 分鐘</p>
      <label className="booking-flow__remark" htmlFor="booking-remark">
        <span>備註（選填）</span>
        <textarea id="booking-remark" value={draft.remark} onChange={(event) => onRemarkChange(event.target.value)} disabled={submitting} aria-describedby="booking-submit-note booking-submit-error" />
      </label>
      <p className="booking-flow__submit-note" id="booking-submit-note"><i className="bi bi-info-circle" aria-hidden="true" />送出時會再次確認時段；成功送出後將等待店家確認。</p>
      {submitError ? <div ref={submitErrorRef} className="booking-flow__submit-error" id="booking-submit-error" tabIndex={-1} role="alert" aria-live="assertive"><i className="bi bi-exclamation-circle" aria-hidden="true" />{submitError}</div> : null}
    </section>
  </>;
}
