import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

export default function HomePage() {
  const { me, refresh } = useAuth();
  const { errorMessage } = useToast();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (!me) {
      refresh();
    }
  }, [me, refresh]);

  useEffect(() => {
    const load = async () => {
      if (!me) {
        setDashboard(null);
        return;
      }
      try {
        const res = await api.dashboard();
        setDashboard(res.data);
      } catch {
        setDashboard(null);
      }
    };
    load();
  }, [me]);

  return (
    <main>
      <header className="hero-section text-center">
        <div className="container">
          {!me ? (
            <div>
              <h1 className="display-3 fw-bold mb-4">歡迎來到 Reservio</h1>
              <p className="lead mb-5">最直覺、最快速的預約系統，讓管理預約不再是難事。</p>
              <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                <Link to="/register" className="btn btn-light btn-lg px-4 gap-3 fw-bold text-primary">
                  開始使用
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-4">
                  立即登入
                </Link>
              </div>
            </div>
          ) : me.role === 'ROLE_BUSINESS' ? (
            <div>
              <h1 className="display-4 fw-bold mb-3">
                店長 <span className="text-warning">{me.business?.name}</span>，你好！
              </h1>
              <p className="lead mb-4">歡迎回來，這是您今日的營運概況。</p>

              <div className="row justify-content-center mt-4">
                <div className="col-md-10">
                  <div className="card bg-white bg-opacity-10 border-0 shadow-lg text-white p-4 dashboard-card" style={{ backdropFilter: 'blur(10px)' }}>
                    <div className="row align-items-center">
                          <Link
                            to="/reservation/today/manage"
                            className="col-sm-4 border-end border-white border-opacity-25 text-decoration-none text-white dashboard-card-link"
                          >
                        <h5 className="small text-uppercase opacity-75">今日預約</h5>
                        <p className="h2 mb-0">{dashboard?.todayCount ?? 0}</p>
                      </Link>
                          <Link
                            to="/reservation/pending/manage"
                            className="col-sm-4 border-end border-white border-opacity-25 text-decoration-none text-white dashboard-card-link"
                          >
                        <h5 className="small text-uppercase opacity-75">待處理預約</h5>
                        <p className="h2 mb-0">{dashboard?.pendingCount ?? 0}</p>
                      </Link>
                      <div className="col-sm-4">
                        <div className="d-grid gap-2">
                          <Link to="/service/manage" className="btn btn-warning fw-bold shadow-sm">
                            管理服務項目
                          </Link>
                          <Link to="/reservation/manage" className="btn btn-light fw-bold shadow-sm">
                            查看所有預約
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="display-4 fw-bold mb-3">
                你好，<span className="text-warning">{me.username}</span>！
              </h1>
              <p className="lead mb-4">歡迎回來，今天想預約哪些服務呢？</p>

              <div className="row justify-content-center mt-4">
                <div className="col-md-8">
                  <div className="card bg-white bg-opacity-10 border-0 shadow-lg text-white p-4" style={{ backdropFilter: 'blur(10px)' }}>
                    <div className="row align-items-center">
                      <div className="col-sm-6 border-end border-white border-opacity-25">
                        <h5 className="small text-uppercase opacity-75">我的今日預約</h5>
                        <p className="h2 mb-0">{dashboard?.todayCount ?? 0}</p>
                      </div>
                      <div className="col-sm-6 text-center">
                        <Link to="/reservation/new" className="btn btn-light fw-bold px-4 shadow-sm">
                          <i className="bi bi-calendar-plus me-1"></i> 立即預約
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {!me ? (
        <section className="container my-5">
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 feature-card p-4">
                <div className="card-body text-center">
                  <div className="display-6 text-primary mb-3">📅</div>
                  <h3 className="card-title h5 fw-bold">快速預約</h3>
                  <p className="card-text text-muted">只需幾秒鐘，即可完成繁瑣的預約流程，提升工作效率。</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 feature-card p-4">
                <div className="card-body text-center">
                  <div className="display-6 text-success mb-3">🔔</div>
                  <h3 className="card-title h5 fw-bold">自動通知</h3>
                  <p className="card-text text-muted">系統自動發送提醒，降低爽約率，維持良好的服務品質。</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 feature-card p-4">
                <div className="card-body text-center">
                  <div className="display-6 text-info mb-3">📊</div>
                  <h3 className="card-title h5 fw-bold">數據分析</h3>
                  <p className="card-text text-muted">掌握預約趨勢，透過報表優化您的業務資源分配。</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {errorMessage ? <div className="visually-hidden">{errorMessage}</div> : null}
    </main>
  );
}
