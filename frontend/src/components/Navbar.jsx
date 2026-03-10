import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';

export default function Navbar({ transparent }) {
  const { me, setMe } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
      setMe(null);
      setSuccessMessage('您已成功登出。');
      navigate('/login');
    } catch (err) {
      setErrorMessage(err.message || '登出失敗');
    }
  };

  const navClass = `navbar navbar-expand-lg navbar-dark fixed-top ${
    transparent ? 'navbar-transparent' : 'bg-gradient navbar-custom-shadow'
  }`;

  return (
    <div>
      <nav className={navClass}>
        <div className="container">
          <Link className="navbar-brand fw-bold fs-3" to="/">
            Reservio
          </Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              {me ? (
                <li className="nav-item">
                  <Link className="nav-link" to="/my/reservations">
                    我的預約
                  </Link>
                </li>
              ) : null}
            </ul>

            <div className="navbar-nav ms-auto">
              {me ? (
                <div className="d-flex align-items-center">
                  <span className="navbar-text me-3 text-white">
                    <i className="bi bi-person-circle"></i> 你好，<strong>{me.username}</strong>！
                  </span>
                  <button type="button" onClick={handleLogout} className="btn btn-outline-light btn-sm px-3 rounded-pill">
                    登出
                  </button>
                </div>
              ) : (
                <div className="d-flex align-items-center">
                  <Link to="/login" className="btn btn-outline-light btn-sm me-2 px-3 rounded-pill">
                    登入
                  </Link>
                  <Link to="/register" className="btn btn-light btn-sm text-primary fw-bold px-3 rounded-pill shadow-sm">
                    註冊
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
