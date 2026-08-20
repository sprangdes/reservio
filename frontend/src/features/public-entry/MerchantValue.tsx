import { Link } from 'react-router-dom';

const items = [
  ['bi-calendar3', '預約管理', '查看並處理店家的預約安排。'],
  ['bi-sliders2', '服務與營業設定', '維護服務內容與營業資訊。'],
  ['bi-bell', '通知與 LINE 整合', '管理通知偏好與既有 LINE 整合。']
];

export default function MerchantValue() {
  return <section className="public-entry__section public-entry__merchant-value" aria-labelledby="merchant-value-title">
    <div className="public-entry__container public-entry__merchant-grid">
      <div className="public-entry__section-heading"><p className="public-entry__eyebrow">給商家</p><h2 id="merchant-value-title">把預約與營運資訊集中管理</h2><p>從服務設定到預約管理，讓店家的日常安排維持清楚。</p><Link to="/register-business" className="public-entry__text-link">建立商家帳號 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></div>
      <ul className="public-entry__merchant-list">{items.map(([icon, title, description]) => <li key={title}><i className={`bi ${icon}`} aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></li>)}</ul>
    </div>
  </section>;
}
