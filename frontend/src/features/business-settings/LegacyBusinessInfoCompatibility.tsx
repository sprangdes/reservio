import { Link } from 'react-router-dom';

export default function LegacyBusinessInfoCompatibility() {
  return <section className="business-settings business-settings--legacy">
    <div className="business-settings__content">
      <header className="business-settings__page-header">
        <div>
          <h1>商家資訊</h1>
          <p>此舊有網址仍可使用；商家設定已集中至新的設定頁面管理。</p>
        </div>
      </header>
      <section className="business-settings__legacy-links" aria-label="商家資訊管理入口">
        <Link to="/business/settings/profile"><strong>商家資料</strong><span>管理商家名稱、類別、聯絡資訊與地址。</span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>
        <Link to="/business/settings/booking"><strong>預約與時段</strong><span>調整預約間隔。</span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>
        <Link to="/business/settings/hours"><strong>營業時間</strong><span>設定每週營業時間與指定日期調整。</span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>
        <Link to="/service/manage"><strong>服務管理</strong><span>新增、編輯、啟用或停用服務。</span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>
      </section>
    </div>
  </section>;
}
