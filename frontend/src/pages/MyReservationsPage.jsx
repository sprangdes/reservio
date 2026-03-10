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
  if (status === 'COMPLETED') {
    return <span className="badge rounded-pill bg-info px-3"><i className="bi bi-flag me-1"></i> 已完成</span>;
  }
  return null;
}

export default function MyReservationsPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [reservations, setReservations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    const res = await api.myReservations();
    setReservations(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id, reason) => {
    try {
      await api.cancelReservation(id, reason ? { cancelReason: reason } : null);
      setSuccessMessage('已送出取消申請/取消成功');
      setCancelReason('');
      setSelectedId(null);
      const modalEl = document.getElementById('cancelModal');
      if (modalEl && window.bootstrap) {
        const instance = window.bootstrap.Modal.getInstance(modalEl);
        if (instance) {
          instance.hide();
        }
      }
      await load();
    } catch (err) {
      setErrorMessage(err.message || '取消失敗');
    }
  };

  const openModal = (id) => {
    setSelectedId(id);
    setCancelReason('');
    if (window.bootstrap) {
      const modalEl = document.getElementById('cancelModal');
      const modal = new window.bootstrap.Modal(modalEl);
      modal.show();
    }
  };

  return (
    <main className="container my-5 pt-5">
      <div className="card shadow-sm border-0 overflow-hidden">
        <div className="card-header bg-gradient text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-person-check me-2"></i>我的預約</h4>
            <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
              <i className="bi bi-list-check me-1"></i> 共 {reservations.length} 筆
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 text-start" style={{ width: '18%' }}>店家</th>
                  <th className="text-start" style={{ width: '12%' }}>日期</th>
                  <th className="text-start" style={{ width: '10%' }}>時間</th>
                  <th className="text-start" style={{ width: '16%' }}>服務項目</th>
                  <th className="text-center" style={{ width: '14%' }}>狀態</th>
                  <th className="text-start" style={{ width: '20%' }}>備註</th>
                  <th className="text-center pe-4" style={{ width: '10%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => (
                  <tr key={res.id}>
                    <td className="ps-4 text-start fw-bold">{res.businessName}</td>
                    <td className="text-start">{res.reservationDate}</td>
                    <td className="text-start fw-bold text-primary">{res.startTime}</td>
                    <td className="text-start"><span className="text-dark">{res.title}</span></td>
                    <td className="text-center"><StatusBadge status={res.status} /></td>
                    <td className="text-start">
                      <small className="text-muted text-break">{res.remark || '無備註'}</small>
                    </td>
                    <td className="text-center pe-4">
                      {res.status === 'PENDING' ? (
                        <button className="btn btn-sm btn-outline-danger px-3" onClick={() => handleCancel(res.id)}>
                          <i className="bi bi-x-lg"></i> 取消
                        </button>
                      ) : res.status === 'CONFIRMED' ? (
                        <button className="btn btn-sm btn-outline-danger px-3" onClick={() => openModal(res.id)}>
                          <i className="bi bi-x-lg"></i> 取消
                        </button>
                      ) : (
                        <small className="text-muted">-</small>
                      )}
                    </td>
                  </tr>
                ))}
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>
                      目前尚無預約資料
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

      <div className="modal fade" id="cancelModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">取消預約</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="cancelReason" className="form-label">取消原因</label>
                <textarea
                  id="cancelReason"
                  className="form-control"
                  rows="3"
                  placeholder="請輸入取消原因"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
                <div className="form-text text-muted">此取消將送交店家確認。</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">返回</button>
              <button
                type="button"
                className="btn btn-danger fw-bold"
                onClick={() => handleCancel(selectedId, cancelReason)}
              >
                確認送出
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
