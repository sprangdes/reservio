import { useEffect, useMemo, useState } from 'react';
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

function SortButton({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  const icon = !active ? 'bi bi-arrow-down-up' : sortDir === 'asc' ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill';
  return (
    <button type="button" className="btn btn-link p-0 text-decoration-none text-dark" onClick={() => onSort(field)}>
      {label} <i className={icon}></i>
    </button>
  );
}

export default function ManageAllPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('reservationDate');
  const [sortDir, setSortDir] = useState('desc');

  const load = async () => {
    const res = await api.businessReservations({ page, size, sortBy, sortDir });
    setData(res.data || { content: [], totalPages: 0, totalElements: 0 });
  };

  useEffect(() => {
    load();
  }, [page, size, sortBy, sortDir]);

  const updateStatus = async (id, action) => {
    try {
      const res = await api.updateReservationStatus(id, { action });
      setSuccessMessage(res.message || '更新成功');
      await load();
    } catch (err) {
      setErrorMessage(err.message || '更新失敗');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const totalPages = Math.max(data.totalPages || 0, 1);
  const content = useMemo(() => data.content || [], [data.content]);

  return (
    <main className="container my-5 pt-5">
      <div className="card shadow-sm border-0 overflow-hidden">
        <div className="card-header bg-gradient text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-journal-text me-2"></i>全部預約管理</h4>
            <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
              <i className="bi bi-list-check me-1"></i> 共 {data.totalElements || 0} 筆
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 text-start" style={{ width: '12%' }}>
                    <SortButton label="日期" field="reservationDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '10%' }}>
                    <SortButton label="時間" field="startTime" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '14%' }}>
                    <SortButton label="客戶名稱" field="username" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '14%' }}>
                    <SortButton label="服務項目" field="title" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '26%' }}>
                    <SortButton label="客戶備註" field="remark" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center" style={{ width: '10%' }}>
                    <SortButton label="狀態" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center pe-4" style={{ width: '14%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {content.map((res) => (
                  <tr key={res.id}>
                    <td className="ps-4 text-start">{res.reservationDate}</td>
                    <td className="text-start fw-bold text-primary">{res.startTime}</td>
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
                {content.length === 0 ? (
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

        <div className="card-footer bg-white py-3 border-top-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <Link to="/" className="btn btn-light btn-sm text-primary fw-bold">
            <i className="bi bi-arrow-left me-1"></i> 返回儀表板
          </Link>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">每頁</span>
            <select
              className="form-select form-select-sm"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              style={{ width: '90px' }}
            >
              {[10, 20, 50].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-muted small">筆</span>
          </div>
          <div className="btn-group">
            <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
              上一頁
            </button>
            <button className="btn btn-outline-secondary btn-sm" disabled>
              第 {page + 1} / {totalPages} 頁
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            >
              下一頁
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
