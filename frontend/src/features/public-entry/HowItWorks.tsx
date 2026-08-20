const customerSteps = ['建立帳號', '選擇店家與服務', '完成預約並查看狀態'];
const merchantSteps = ['建立商家帳號', '完成商家資料', '開始管理預約'];

function Flow({ title, icon, steps }: Readonly<{ title: string; icon: string; steps: string[] }>) {
  return <article className="public-entry__flow"><div className="public-entry__flow-title"><i className={`bi ${icon}`} aria-hidden="true" /><h3>{title}</h3></div><ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></article>;
}

export default function HowItWorks() {
  return <section className="public-entry__section public-entry__how" aria-labelledby="how-title"><div className="public-entry__container"><div className="public-entry__section-heading"><p className="public-entry__eyebrow">如何開始使用</p><h2 id="how-title">為不同需求，安排同樣清楚的下一步</h2></div><div className="public-entry__flows"><Flow title="客戶" icon="bi-person" steps={customerSteps} /><Flow title="商家" icon="bi-shop" steps={merchantSteps} /></div></div></section>;
}
