const capabilities = [
  ['bi-clipboard2-check', '預約狀態', '客戶可查看自己的預約狀態。'],
  ['bi-calendar-week', '預約管理', '商家可管理預約安排。'],
  ['bi-gear', '商家設定', '維護服務與商家資料。'],
  ['bi-bell', '通知偏好', '依需求調整通知設定。'],
  ['bi-chat-dots', 'LINE 相關流程', '支援帳號連結與商家整合。']
];

export default function CapabilityProof() {
  return <section className="public-entry__section public-entry__proof" aria-labelledby="proof-title"><div className="public-entry__container"><div className="public-entry__proof-heading"><p className="public-entry__eyebrow">Reservio 能做什麼</p><h2 id="proof-title">從預約到設定，保留必要而明確的工具</h2></div><ul>{capabilities.map(([icon, title, description]) => <li key={title}><i className={`bi ${icon}`} aria-hidden="true" /><h3>{title}</h3><p>{description}</p></li>)}</ul></div></section>;
}
