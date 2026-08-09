import type { BookingService } from './domain';

type Props = Readonly<{
  businessName: string | null;
  services: BookingService[];
  value: string | null;
  state: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  onSelect: (service: BookingService) => void;
  onRetry: () => void;
}>;

export function ServiceSelection({ businessName, services, value, state, onSelect, onRetry }: Props) {
  return <section className="booking-flow__section" aria-labelledby="booking-service-heading">
    <h2 id="booking-service-heading">選擇服務</h2>
    {!businessName ? <p className="booking-flow__hint">請先選擇店家。</p> : null}
    {state === 'loading' ? <div className="booking-flow__skeleton" aria-label="正在載入服務"><span /><span /><span /></div> : null}
    {state === 'error' ? <div className="booking-flow__state" role="alert"><p>暫時無法載入服務，請稍後再試。</p><button type="button" onClick={onRetry}>重新載入服務</button></div> : null}
    {state === 'empty' ? <div className="booking-flow__state"><p>此店家目前沒有可預約的服務。</p></div> : null}
    {state === 'ready' ? <div className="booking-flow__services" role="radiogroup" aria-label="預約服務">
      {services.filter((service) => service.active).map((service) => <label key={service.id} className={value === service.id ? 'is-selected' : ''}>
        <input type="radio" name="booking-service" checked={value === service.id} onChange={() => onSelect(service)} />
        <span className="booking-flow__radio" aria-hidden="true">{value === service.id ? '✓' : ''}</span>
        <strong>{service.name}</strong>
        <small>{service.durationMinutes} 分鐘</small>
      </label>)}
    </div> : null}
  </section>;
}
