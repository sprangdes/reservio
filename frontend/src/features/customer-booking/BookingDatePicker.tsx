import { useEffect, useRef, useState } from 'react';
import { addLocalMonths, fromFlatpickrDateValue, localDateFromDate, toFlatpickrDateValue } from './bookingDates';

type Props = Readonly<{
  value: string | null;
  disabledDates: string[];
  disabledState: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  onChange: (date: string | null) => void;
  onRetryDisabledDates: () => void;
}>;

export function BookingDatePicker({ value, disabledDates, disabledState, onChange, onRetryDisabledDates }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  const [inputError, setInputError] = useState('');
  onChangeRef.current = onChange;

  useEffect(() => {
    const input = inputRef.current;
    const flatpickr = (globalThis as { flatpickr?: (target: HTMLInputElement, options: Record<string, unknown>) => { destroy: () => void } }).flatpickr;
    if (!input || !flatpickr || disabledState !== 'ready') return;
    const minDate = localDateFromDate(new Date());
    const maxDate = addLocalMonths(minDate, 3) || minDate;
    const picker = flatpickr(input, {
      dateFormat: 'Y-m-d', allowInput: true, minDate, maxDate, disable: disabledDates,
      defaultDate: toFlatpickrDateValue(value), calendarClass: 'app-date-picker',
      onChange: (_dates: unknown, dateValue: string) => {
        const localDate = fromFlatpickrDateValue(dateValue);
        if (localDate) {
          setInputError('');
          onChangeRef.current(localDate);
        }
      }
    });
    return () => picker.destroy();
  }, [disabledDates, disabledState]);

  return <section className="booking-flow__section booking-flow__date" aria-labelledby="booking-date-heading">
    <h2 id="booking-date-heading">選擇日期</h2>
    {disabledState === 'loading' ? <p className="booking-flow__hint" aria-live="polite">正在更新不可預約日期。</p> : null}
    {disabledState === 'error' ? <div className="booking-flow__state" role="alert"><p>暫時無法取得不可預約日期，請稍後再試。</p><button type="button" onClick={onRetryDisabledDates}>重新載入日期</button></div> : null}
    <label htmlFor="booking-date">預約日期</label>
    <input
      id="booking-date"
      ref={inputRef}
      className="booking-flow__date-input"
      defaultValue={toFlatpickrDateValue(value) || ''}
      placeholder="請選擇日期"
      inputMode="numeric"
      disabled={disabledState !== 'ready'}
      aria-invalid={Boolean(inputError)}
      aria-describedby={inputError ? 'booking-date-error' : undefined}
      onBlur={(event) => {
        const localDate = fromFlatpickrDateValue(event.target.value);
        if (!event.target.value) {
          setInputError('');
          onChange(null);
          return;
        }
        if (!localDate || disabledDates.includes(localDate)) {
          setInputError('請選擇有效且可預約的日期。');
          return;
        }
        setInputError('');
        if (localDate !== value) onChange(localDate);
      }}
    />
    {inputError ? <p id="booking-date-error" className="booking-flow__input-error" role="alert">{inputError}</p> : null}
  </section>;
}
