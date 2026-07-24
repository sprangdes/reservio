import { Link } from 'react-router-dom';

export default function OperationsOverviewPage() {
  return <section className="operations-overview" aria-labelledby="operations-overview-title"><header><p>商家工作區</p><h1 id="operations-overview-title">營運概覽</h1><span>預約、顧客與服務管理正逐步整合至此工作區。</span></header><section className="operations-overview__state" aria-labelledby="operations-overview-state-title"><div className="operations-overview__state-icon"><i className="bi bi-grid-1x2" aria-hidden="true" /></div><div><h2 id="operations-overview-state-title">工作區已建立</h2><p>核心營運入口現已採用新版導覽。資料型營運摘要將在後續階段，以既有資料契約逐步整合。</p></div><Link to="/reservation/manage" className="operations-overview__link">前往預約中心 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></section></section>;
}
