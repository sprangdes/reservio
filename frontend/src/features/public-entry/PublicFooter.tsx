import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return <footer className="public-entry__footer"><div className="public-entry__container public-entry__footer-inner"><Link className="public-entry__brand" to="/">Reservio</Link><nav aria-label="頁尾導覽"><Link to="/login">登入</Link><Link to="/register">建立客戶帳號</Link><Link to="/register-business">建立商家帳號</Link></nav><p>© Reservio</p></div></footer>;
}
