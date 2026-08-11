const items = [
  ['bi-shop', '選擇可預約的店家與服務', '依照需求挑選適合的服務。'],
  ['bi-calendar2-check', '選擇日期與時段', '在可預約的時段中安排時間。'],
  ['bi-clipboard2-check', '查看自己的預約狀態', '集中掌握每一筆已建立的預約。']
];

export default function CustomerValue() {
  return <section className="public-entry__section public-entry__customer-value" aria-labelledby="customer-value-title">
    <div className="public-entry__container">
      <div className="public-entry__section-heading"><p className="public-entry__eyebrow">給客戶</p><h2 id="customer-value-title">預約服務，流程清楚而直接</h2></div>
      <ol className="public-entry__value-list">{items.map(([icon, title, description], index) => <li key={title}>
        <span className="public-entry__step-number">0{index + 1}</span><i className={`bi ${icon}`} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>
      </li>)}</ol>
    </div>
  </section>;
}
