import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { api } from '../api';
import { useToast } from '../state/ToastContext';

export default function Navbar() {
  const { me, setMe } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(false);

  useEffect(() => {
    const media = globalThis.matchMedia('(max-width: 768px)');
    const update = () => setHoverEnabled(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      setMe(null);
      setSuccessMessage('您已成功登出。');
      navigate('/login');
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '登出失敗');
    }
  };

  const navClass = 'navbar navbar-expand-lg navbar-dark fixed-top navbar-transparent navbar-custom-shadow';

  return (
    <div>
      <nav
        className={navClass}
        onMouseEnter={() => hoverEnabled && setOpen(true)}
        onMouseLeave={() => hoverEnabled && setOpen(false)}
      >
        <div className="container">
          <Link className="navbar-brand fw-bold fs-3 brand-highlight" to="/">
            Reserv<span className="brand-accent">io</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`collapse navbar-collapse ${open ? 'show' : ''}`} id="navbarNav">
            <ul className="navbar-nav me-auto">
              {me ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/my/reservations">
                      我的預約
                    </Link>
                  </li>
                  {me.role === 'ROLE_BUSINESS' ? (
                    <li className="nav-item">
                      <Link className="nav-link" to="/business/info">
                        商家資訊
                      </Link>
                    </li>
                  ) : null}
                </>
              ) : null}
            </ul>

            <div className="navbar-nav ms-auto">
              {me ? (
                <div className="d-flex align-items-center">
                  <span className="navbar-text me-3 text-white text-white-strong">
                    <i className="bi bi-person-circle"></i> 你好，<strong>{String(me.username || '')}</strong>！
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
