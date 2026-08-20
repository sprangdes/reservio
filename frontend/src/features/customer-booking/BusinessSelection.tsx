import type { BookingBusiness } from './domain';

type Props = Readonly<{
  businesses: BookingBusiness[];
  value: string | null;
  state: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  onSelect: (business: BookingBusiness) => void;
  onRetry: () => void;
}>;

export function BusinessSelection({ businesses, value, state, onSelect, onRetry }: Props) {
  return <section className="booking-flow__section" aria-labelledby="booking-business-heading">
    <h2 id="booking-business-heading">選擇店家</h2>
    {state === 'loading' ? <div className="booking-flow__skeleton" aria-label="正在載入預約店家"><span /><span /></div> : null}
    {state === 'error' ? <div className="booking-flow__state" role="alert"><p>暫時無法載入預約資訊，請稍後再試。</p><button type="button" onClick={onRetry}>重新載入</button></div> : null}
    {state === 'empty' ? <div className="booking-flow__state"><p>目前沒有可用的預約店家。</p></div> : null}
    {state === 'ready' ? <div className="booking-flow__businesses" role="radiogroup" aria-label="預約店家">
      {businesses.map((business) => <label key={business.id} className={value === business.id ? 'is-selected' : ''}>
        <input type="radio" name="booking-business" checked={value === business.id} onChange={() => onSelect(business)} />
        <i className="bi bi-shop" aria-hidden="true" />
        <span>{business.name}</span>
        {value === business.id ? <b aria-hidden="true">✓</b> : null}
      </label>)}
    </div> : null}
  </section>;
}
