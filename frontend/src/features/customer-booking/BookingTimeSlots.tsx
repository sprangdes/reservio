import type { BookingSlot } from './domain';

type Props = Readonly<{
  slots: BookingSlot[];
  selectedTime: string | null;
  state: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  onSelect: (slot: BookingSlot) => void;
  onRetry: () => void;
  onReturnToServices: () => void;
}>;

export function BookingTimeSlots({ slots, selectedTime, state, onSelect, onRetry, onReturnToServices }: Props) {
  return <section className="booking-flow__section booking-flow__slots" aria-labelledby="booking-slots-heading">
    <h2 id="booking-slots-heading">可預約時段</h2>
    {state === 'idle' ? <p className="booking-flow__hint">請選擇日期以查看時段。</p> : null}
    {state === 'loading' ? <div className="booking-flow__slot-skeleton" aria-label="正在載入可預約時段"><span /><span /><span /><span /></div> : null}
    {state === 'error' ? <div className="booking-flow__state" role="alert"><p>暫時無法載入可預約時段。</p><button type="button" onClick={onRetry}>重新載入時段</button></div> : null}
    {state === 'empty' ? <div className="booking-flow__state"><p>這一天目前沒有可預約的時段。</p><button type="button" onClick={onReturnToServices}>返回服務選擇</button></div> : null}
    {state === 'ready' ? <div className="booking-flow__slot-grid" role="radiogroup" aria-label="可預約時段">
      {slots.map((slot) => <button key={slot.startTime} type="button" role="radio" aria-checked={selectedTime === slot.startTime} disabled={!slot.available} className={selectedTime === slot.startTime ? 'is-selected' : ''} onClick={() => onSelect(slot)}>
        <span aria-hidden="true">{selectedTime === slot.startTime ? '✓' : slot.available ? '○' : '⊘'}</span>
        <strong>{slot.startTime}</strong>
        {!slot.available ? <small>目前不可預約</small> : null}
      </button>)}
    </div> : null}
    {(state === 'ready' || state === 'empty') ? <p className="booking-flow__availability-note"><i className="bi bi-info-circle" aria-hidden="true" />時段僅代表目前可預約；送出預約時會再次確認。</p> : null}
  </section>;
}
