import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../../api';
import { isUnauthorizedError } from '../../sessionEvents';
import { mapBookingCreateRequest } from './bookingApi';
import { BookingContextSummary } from './BookingContextSummary';
import { BookingDatePicker } from './BookingDatePicker';
import { BookingProgress } from './BookingProgress';
import { BookingResultState } from './BookingResultState';
import { BookingReview } from './BookingReview';
import { BookingSubmitBar } from './BookingSubmitBar';
import { BookingTimeSlots } from './BookingTimeSlots';
import { BusinessSelection } from './BusinessSelection';
import { ServiceSelection } from './ServiceSelection';
import type { BookingCreateResult } from './domain';
import { normalizeBookingCreateResult } from './normalizers';
import { useBookingFlow } from './useBookingFlow';

type Step = 1 | 2 | 3;

function responseData(value: unknown): unknown {
  return value && typeof value === 'object' && 'data' in value ? (value as { data: unknown }).data : value;
}

export function BookingFlowPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BookingCreateResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const conflictRef = useRef<HTMLDivElement | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const submitControllerRef = useRef<AbortController | null>(null);
  const flow = useBookingFlow();
  const selectedSlot = flow.slots.find((slot) => slot.startTime === flow.draft.startTime && slot.available);
  const activeService = Boolean(flow.draft.service && flow.services.some((service) => service.id === flow.draft.service?.id && service.active));
  const canProceedStepOne = Boolean(flow.draft.business && activeService);
  const canProceedStepTwo = Boolean(flow.draft.date && selectedSlot && flow.draft.estimatedEndTime);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; submitControllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (step === 2 || step === 3) headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (conflictMessage && step === 2) conflictRef.current?.focus();
  }, [conflictMessage, step]);

  useEffect(() => {
    if (step === 3 && !canProceedStepTwo) setStep(flow.draft.business && activeService ? 2 : 1);
  }, [activeService, canProceedStepTwo, flow.draft.business, step]);

  const moveToStep = (nextStep: Step) => {
    if (submitting) return;
    setSubmitError(null);
    setConflictMessage(null);
    setStep(nextStep);
  };

  const submit = async () => {
    if (submittingRef.current || !canProceedStepTwo) return;
    const snapshot = { ...flow.draft };
    const request = mapBookingCreateRequest(snapshot);
    if (!request) {
      setSubmitError('預約資料有誤，請確認後再試。');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    const controller = new AbortController();
    submitControllerRef.current = controller;
    try {
      const response = await api.createReservation(request, { signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;
      const normalized = normalizeBookingCreateResult(responseData(response));
      if (!normalized) {
        setSubmitError('暫時無法送出預約，請稍後再試。');
        return;
      }
      setResult(normalized);
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted || isUnauthorizedError(error)) return;
      if (error instanceof ApiError && error.status === 400) {
        setSubmitError('預約資料有誤，請確認後再試。');
      } else if (error instanceof ApiError && error.status === 409) {
        flow.clearSelectedSlot();
        setConflictMessage('剛才選擇的時段已無法預約，已為你重新整理可用時段。');
        setStep(2);
        void flow.refreshSlots();
      } else {
        setSubmitError('暫時無法送出預約，請稍後再試。');
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setSubmitting(false);
      if (submitControllerRef.current === controller) submitControllerRef.current = null;
      submittingRef.current = false;
    }
  };

  if (result) return <BookingResultState result={result} />;

  return <main className="booking-flow">
    <header className="booking-flow__mobile-header">
      <button type="button" onClick={() => navigate(-1)} disabled={submitting}><i className="bi bi-chevron-left" aria-hidden="true" />返回</button>
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
            <div className="booking-flow__actions"><span /><button type="button" className="booking-flow__next" disabled={!canProceedStepOne} onClick={() => moveToStep(2)}>下一步：選擇日期與時間<i className="bi bi-arrow-right" aria-hidden="true" /></button></div>
          </> : null}
          {step === 2 ? <>
            <header className="booking-flow__heading"><p className="booking-flow__selected-context"><i className="bi bi-shop" aria-hidden="true" />{flow.draft.business?.name} · {flow.draft.service?.name} · {flow.draft.service?.durationMinutes} 分鐘</p><h1 ref={headingRef} tabIndex={-1}>選擇日期與時間</h1><p>請選擇方便的日期與時段；送出預約時會再次確認可用性。</p></header>
            {conflictMessage ? <div className="booking-flow__conflict" ref={conflictRef} tabIndex={-1} role="alert" aria-live="assertive"><i className="bi bi-arrow-repeat" aria-hidden="true" />{conflictMessage}</div> : null}
            <div className="booking-flow__date-time-grid">
              <BookingDatePicker value={flow.draft.date} disabledDates={flow.disabledDates} disabledState={flow.disabledDateState} onChange={flow.selectDate} onRetryDisabledDates={() => void flow.retryDisabledDates()} />
              <BookingTimeSlots slots={flow.slots} selectedTime={flow.draft.startTime} state={flow.slotState} onSelect={flow.selectSlot} onRetry={() => void flow.retrySlots()} onReturnToServices={() => moveToStep(1)} />
            </div>
            <div className="booking-flow__actions"><button type="button" className="booking-flow__back" onClick={() => moveToStep(1)}><i className="bi bi-arrow-left" aria-hidden="true" />返回服務選擇</button><button type="button" className="booking-flow__next" disabled={!canProceedStepTwo} onClick={() => moveToStep(3)}>下一步：確認預約<i className="bi bi-arrow-right" aria-hidden="true" /></button></div>
          </> : null}
          {step === 3 ? <>
            <BookingReview draft={flow.draft} submitError={submitError} submitting={submitting} onRemarkChange={flow.updateRemark} headingRef={headingRef} />
            <BookingSubmitBar submitting={submitting} onBack={() => moveToStep(2)} onSubmit={() => void submit()} />
          </> : null}
        </div>
        <BookingContextSummary draft={flow.draft} />
      </div>
    </div>
  </main>;
}
