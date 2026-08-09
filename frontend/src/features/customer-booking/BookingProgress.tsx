type BookingProgressProps = Readonly<{ step: 1 | 2 | 3 }>;

const steps = ['選擇服務', '日期與時間', '確認'];

export function BookingProgress({ step }: BookingProgressProps) {
  return (
    <nav className="booking-flow__progress" aria-label={`預約進度：步驟 ${step} / 3，${steps[step - 1]}`}>
      <p aria-live="polite">步驟 {step} / 3 · {steps[step - 1]}</p>
      <ol>
        {steps.map((label, index) => {
          const number = index + 1;
          const state = number < step ? 'is-complete' : number === step ? 'is-current' : '';
          return <li key={label} className={state} aria-current={number === step ? 'step' : undefined}>
            <span aria-hidden="true">{number < step ? '✓' : number}</span>
            <strong>{label}</strong>
          </li>;
        })}
      </ol>
    </nav>
  );
}
