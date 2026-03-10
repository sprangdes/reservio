import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';

function StatusBadge({ status }) {
  if (status === 'PENDING') {
    return <span className="badge rounded-pill bg-warning text-dark px-3"><i className="bi bi-hourglass-split me-1"></i> 待確認</span>;
  }
  if (status === 'CONFIRMED') {
    return <span className="badge rounded-pill bg-success px-3"><i className="bi bi-check-circle me-1"></i> 已確認</span>;
  }
  if (status === 'CANCEL_REQUESTED') {
    return <span className="badge rounded-pill bg-secondary px-3"><i className="bi bi-exclamation-circle me-1"></i> 取消確認中</span>;
  }
  if (status === 'CANCELLED') {
    return <span className="badge rounded-pill bg-secondary px-3"><i className="bi bi-x-circle me-1"></i> 已取消</span>;
  }
  return null;
}

export default function ManageTodayPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [reservations, setReservations] = useState([]);

  const load = async () => {
    const res = await api.todayReservations();
    setReservations(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, action) => {
    try {
      const res = await api.updateReservationStatus(id, { action });
      setSuccessMessage(res.message || '更新成功');
      await load();
    } catch (err) {
      setErrorMessage(err.message || '更新失敗');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <main className="container my-5 pt-5">
      <div className="card shadow-sm border-0 overflow-hidden">
        <div className="card-header bg-gradient text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-calendar-check me-2"></i>今日預約管理</h4>
            <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
              <i className="bi bi-clock me-1"></i> {todayStr}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 text-start" style={{ width: '12%' }}>時間</th>
                  <th className="text-start" style={{ width: '15%' }}>客戶名稱</th>
                  <th className="text-start" style={{ width: '18%' }}>服務項目</th>
                  <th className="text-start" style={{ width: '25%' }}>客戶備註</th>
                  <th className="text-center" style={{ width: '12%' }}>預約狀態</th>
                  <th className="text-center pe-4" style={{ width: '18%' }}>操作管理</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => (
                  <tr key={res.id}>
                    <td className="ps-4 text-start fw-bold text-primary">{res.startTime}</td>
                    <td className="text-start">{res.username}</td>
                    <td className="text-start"><span className="text-dark">{res.title}</span></td>
                    <td className="text-start">
                      <small className="text-muted text-break">{res.remark || '無備註'}</small>
                      {res.status === 'CANCEL_REQUESTED' ? (
                        <div className="mt-1">
                          <small className="text-danger text-break">
                            <i className="bi bi-exclamation-circle me-1"></i>
                            取消原因：<span>{res.cancelReason}</span>
                          </small>
                        </div>
                      ) : null}
                    </td>
                    <td className="text-center"><StatusBadge status={res.status} /></td>
                    <td className="text-center pe-4">
                      {res.status === 'PENDING' ? (
                        <div className="btn-group">
                          <button className="btn btn-sm btn-outline-success px-3" onClick={() => updateStatus(res.id, 'confirm')}>
                            <i className="bi bi-check-lg"></i> 確認
                          </button>
                          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => updateStatus(res.id, 'cancel')}>
                            <i className="bi bi-x-lg"></i> 取消
                          </button>
                        </div>
                      ) : res.status === 'CANCEL_REQUESTED' ? (
                        <div className="btn-group">
                          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => updateStatus(res.id, 'approveCancel')}>
                            <i className="bi bi-x-circle me-1"></i> 確認取消
                          </button>
                          <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => updateStatus(res.id, 'rejectCancel')}>
                            <i className="bi bi-arrow-counterclockwise me-1"></i> 駁回
                          </button>
                        </div>
                      ) : (
                        <small className="text-muted">無可用操作</small>
                      )}
                    </td>
                  </tr>
                ))}
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>
                      目前尚無今日預約資料
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer bg-white py-3 border-top-0 ps-4">
          <Link to="/" className="btn btn-light btn-sm text-primary fw-bold">
            <i className="bi bi-arrow-left me-1"></i> 返回儀表板
          </Link>
        </div>
      </div>
    </main>
  );
}
