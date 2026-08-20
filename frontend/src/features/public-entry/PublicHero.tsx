import { Link } from 'react-router-dom';

function CalendarIllustration() {
  return <svg className="public-entry__hero-art" viewBox="0 0 520 380" aria-hidden="true" focusable="false">
    <path d="M152 96h202a14 14 0 0 1 14 14v184a14 14 0 0 1-14 14H152a14 14 0 0 1-14-14V110a14 14 0 0 1 14-14Z" />
    <path d="M138 151h230M197 72v48M309 72v48M183 188h35M244 188h35M305 188h35M183 231h35M244 231h35M305 231h35" />
    <path d="m298 260 15 15 33-38" className="public-entry__hero-art-check" />
    <path d="M99 302h314M72 255h42M407 255h42" className="public-entry__hero-art-light" />
    <circle cx="97" cy="232" r="4" className="public-entry__hero-art-accent" /><circle cx="425" cy="230" r="4" className="public-entry__hero-art-accent" />
    <path d="M394 132c31 0 56 25 56 56s-25 56-56 56-56-25-56-56 25-56 56-56Z" /><path d="M394 155v34l22 15" />
  </svg>;
}

export default function PublicHero({ isCustomer }: Readonly<{ isCustomer: boolean }>) {
  const primary = isCustomer ? { label: '前往預約', to: '/reservation/new' } : { label: '開始預約', to: '/reservation/new' };
  const secondary = isCustomer ? { label: '我的預約', to: '/my/reservations' } : { label: '建立商家帳號', to: '/register-business' };
  return <section className="public-entry__hero" aria-labelledby="public-home-title">
    <div className="public-entry__container public-entry__hero-grid">
      <div className="public-entry__hero-copy">
        <p className="public-entry__eyebrow">Reservio 預約服務</p>
        <h1 id="public-home-title" tabIndex={-1}>安排服務預約，也讓商家有條理地管理每一筆預約。</h1>
        <p>客戶可以預約服務，商家可以集中管理預約與營運資訊，讓每個流程保持清楚有序。</p>
        <div className="public-entry__hero-actions">
          <Link className="public-entry__button public-entry__button--primary" to={primary.to}>{primary.label}<i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          <Link className="public-entry__button public-entry__button--merchant" to={secondary.to}>{secondary.label}</Link>
        </div>
      </div>
      <div className="public-entry__hero-visual"><CalendarIllustration /></div>
    </div>
  </section>;
}
