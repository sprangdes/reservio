import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatLocalDateZhTw, formatLocalTimeRange } from './bookingDates';
import type { BookingCreateResult } from './domain';

export function BookingResultState({ result }: Readonly<{ result: BookingCreateResult }>) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <main className="booking-result" aria-labelledby="booking-result-title">
    <header className="booking-result__mobile-header"><strong>Reservio</strong></header>
    <section className="booking-result__content">
      <p className="booking-result__eyebrow">預約已送出</p>
      <h1 id="booking-result-title" ref={headingRef} tabIndex={-1}>已送出，等待店家確認</h1>
      <p className="booking-result__status" role="status" aria-live="polite"><i className="bi bi-hourglass-split" aria-hidden="true" />等待店家確認</p>
      <p className="booking-result__copy">我們已收到你的預約申請；店家確認後，狀態會更新於「我的預約」。</p>
      <dl className="booking-result__facts">
        <div><dt>店家</dt><dd>{result.businessName}</dd></div>
        <div><dt>服務</dt><dd>{result.serviceName}</dd></div>
        <div><dt>日期</dt><dd>{formatLocalDateZhTw(result.date)}</dd></div>
        <div><dt>時間</dt><dd>{formatLocalTimeRange(result.startTime, result.endTime)}</dd></div>
        {result.remark ? <div><dt>備註</dt><dd>{result.remark}</dd></div> : null}
      </dl>
      <div className="booking-result__actions">
        <button type="button" onClick={() => navigate('/my/reservations')}>查看我的預約</button>
        <button type="button" onClick={() => navigate('/')}>返回首頁</button>
      </div>
    </section>
  </main>;
}
