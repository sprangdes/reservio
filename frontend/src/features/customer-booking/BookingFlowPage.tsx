import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingContextSummary } from './BookingContextSummary';
import { BookingDatePicker } from './BookingDatePicker';
import { BookingProgress } from './BookingProgress';
import { BookingTimeSlots } from './BookingTimeSlots';
import { BusinessSelection } from './BusinessSelection';
import { ServiceSelection } from './ServiceSelection';
import { useBookingFlow } from './useBookingFlow';

export function BookingFlowPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const flow = useBookingFlow();
  const canProceedStepOne = Boolean(flow.draft.business && flow.draft.service);
  const selectedSlot = flow.slots.find((slot) => slot.startTime === flow.draft.startTime && slot.available);
  const canProceedStepTwo = Boolean(flow.draft.date && selectedSlot);

  useEffect(() => { if (step === 2) headingRef.current?.focus(); }, [step]);

  return <main className="booking-flow">
    <header className="booking-flow__mobile-header">
      <button type="button" onClick={() => navigate(-1)}><i className="bi bi-chevron-left" aria-hidden="true" />返回</button>
      <strong>建立預約</strong><span aria-hidden="true" />
    </header>
    <div className="booking-flow__container">
      <BookingProgress step={step} />
      <div className="booking-flow__layout">
        <div className="booking-flow__task">
          {step === 1 ? <>
            <header className="booking-flow__heading"><h1 ref={headingRef} tabIndex={-1}>建立預約</h1><p>先選擇店家與服務，接著查看可預約時段。</p></header>
            <BusinessSelection businesses={flow.businesses} value={flow.draft.business?.id || null} state={flow.businessState} onSelect={flow.selectBusiness} onRetry={() => void flow.retryBusinesses()} />
            <ServiceSelection businessName={flow.draft.business?.name || null} services={flow.services} value={flow.draft.service?.id || null} state={flow.serviceState} onSelect={flow.selectService} onRetry={() => void flow.retryServices()} />
          </> : <>
            <header className="booking-flow__heading"><p className="booking-flow__selected-context"><i className="bi bi-shop" aria-hidden="true" />{flow.draft.business?.name} · {flow.draft.service?.name} · {flow.draft.service?.durationMinutes} 分鐘</p><h1 ref={headingRef} tabIndex={-1}>選擇日期與時間</h1><p>請選擇方便的日期與時段；送出預約時會再次確認可用性。</p></header>
            <div className="booking-flow__date-time-grid">
              <BookingDatePicker value={flow.draft.date} disabledDates={flow.disabledDates} disabledState={flow.disabledDateState} onChange={flow.selectDate} onRetryDisabledDates={() => void flow.retryDisabledDates()} />
              <BookingTimeSlots slots={flow.slots} selectedTime={flow.draft.startTime} state={flow.slotState} onSelect={flow.selectSlot} onRetry={() => void flow.retrySlots()} onReturnToServices={() => setStep(1)} />
            </div>
          </>}
          <div className="booking-flow__actions">
            {step === 2 ? <button type="button" className="booking-flow__back" onClick={() => setStep(1)}><i className="bi bi-arrow-left" aria-hidden="true" />返回服務選擇</button> : <span />}
            {step === 1 ? <button type="button" className="booking-flow__next" disabled={!canProceedStepOne} onClick={() => setStep(2)}>下一步：選擇日期與時間<i className="bi bi-arrow-right" aria-hidden="true" /></button> : <button type="button" className="booking-flow__next" disabled={!canProceedStepTwo} aria-describedby="booking-phase-three-boundary" onClick={() => undefined}>下一步：確認預約<i className="bi bi-arrow-right" aria-hidden="true" /></button>}
          </div>
          {step === 2 ? <p className="booking-flow__phase-boundary" id="booking-phase-three-boundary">確認與送出將於下一階段提供。</p> : null}
        </div>
        <BookingContextSummary draft={flow.draft} />
      </div>
    </div>
  </main>;
}
