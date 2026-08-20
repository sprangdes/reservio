type Props = Readonly<{
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}>;

export function BookingSubmitBar({ submitting, onBack, onSubmit }: Props) {
  return <div className="booking-flow__actions booking-flow__submit-bar">
    <button type="button" className="booking-flow__back" onClick={onBack} disabled={submitting}><i className="bi bi-arrow-left" aria-hidden="true" />返回日期與時間</button>
    <button type="button" className="booking-flow__next" onClick={onSubmit} disabled={submitting} aria-busy={submitting} aria-live="polite">{submitting ? '正在送出預約…' : '送出預約'}</button>
  </div>;
}
