import { Link } from 'react-router-dom';

export default function FinalAudienceCTA({ isCustomer }: Readonly<{ isCustomer: boolean }>) {
  return <section className="public-entry__section public-entry__final" aria-label="開始使用 Reservio"><div className="public-entry__container public-entry__final-grid">
    <article className="public-entry__final-customer"><p className="public-entry__eyebrow">我是客戶</p><h2>尋找服務並預約</h2><p>選擇適合的店家、服務與可預約時段。</p><Link to="/reservation/new" className="public-entry__button public-entry__button--light">{isCustomer ? '前往預約' : '開始預約'} <i className="bi bi-arrow-right" aria-hidden="true" /></Link></article>
    <article className="public-entry__final-merchant"><p className="public-entry__eyebrow">我是商家</p><h2>開始管理預約</h2><p>建立商家帳號後，完成資料並安排日常服務。</p><Link to="/register-business" className="public-entry__button public-entry__button--orange">建立商家帳號 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></article>
  </div></section>;
}
