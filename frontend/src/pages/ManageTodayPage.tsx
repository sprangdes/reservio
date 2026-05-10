import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatTimeHM } from '../utils/time.js';
import { useToast } from '../state/ToastContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import ReservationStatusBadge from '../components/reservations/ReservationStatusBadge.jsx';
import ReservationSortButton from '../components/reservations/ReservationSortButton.jsx';
import ReservationPaginationFooter from '../components/reservations/ReservationPaginationFooter.jsx';
import { useReservationListControls } from '../hooks/useReservationListControls.js';

export default function ManageTodayPage() {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [services, setServices] = useState([]);
  const [filterDraft, setFilterDraft] = useState({ service: '', keyword: '', status: '' });
  const [filters, setFilters] = useState({ service: '', keyword: '', status: '' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('startTime');
  const [sortDir, setSortDir] = useState('asc');

  const load = async () => {
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const condition = {
        startDate: todayStr,
        endDate: todayStr,
        service: filters.service || null,
        keyword: filters.keyword || null,
        status: filters.status || null
      };
      const res = await api.businessReservations({ page, size, sortBy, sortDir }, condition);
      setData(res.data || res || { content: [], totalPages: 0, totalElements: 0 });
    } catch (err) {
      setErrorMessage(err.message || '載入失敗');
    }
  };

  useEffect(() => {
    void load();
  }, [page, size, sortBy, sortDir, filters]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const businessId = me?.business?.id;
        if (!businessId) return;
        const res = await api.businessActiveServices(businessId);
        const items = res?.items || res?.data || res || [];
        setServices(Array.isArray(items) ? items : []);
      } catch (err) {
        setErrorMessage(err.message || '載入服務項目失敗');
      }
    };
    void loadServices();
  }, [me]);

  const updateStatus = async (id, action) => {
    try {
      const res = await api.updateReservationStatus(id, { action });
      setSuccessMessage(res.message || '更新成功');
      await load();
    } catch (err) {
      setErrorMessage(err.message || '更新失敗');
    }
  };

  const { handleSort, applyFilters } = useReservationListControls({
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
    setPage,
    filterDraft,
    setFilters
  });

  const clearFilters = () => {
    const empty = { service: '', keyword: '', status: '' };
    setFilterDraft(empty);
    setFilters(empty);
    setPage(0);
  };

  const totalPages = Math.max(data.totalPages || 0, 1);
  const content = useMemo(() => data.content || [], [data.content]);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const renderDesktopActions = (reservation) => {
    if (reservation.status === 'PENDING') {
      return (
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-sm btn-outline-success px-3" onClick={() => updateStatus(reservation.id, 'confirm')}>
            <i className="bi bi-check-lg"></i> 確認
          </button>
          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => updateStatus(reservation.id, 'cancel')}>
            <i className="bi bi-x-lg"></i> 取消
          </button>
        </div>
      );
    }
    if (reservation.status === 'CANCEL_REQUESTED') {
      return (
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => updateStatus(reservation.id, 'approveCancel')}>
            <i className="bi bi-x-circle me-1"></i> 確認取消
          </button>
          <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => updateStatus(reservation.id, 'rejectCancel')}>
            <i className="bi bi-arrow-counterclockwise me-1"></i> 駁回
          </button>
        </div>
      );
    }
    return <small className="text-muted">無可用操作</small>;
  };
  const renderMobileActions = (reservation) => {
    if (reservation.status === 'PENDING') {
      return (
        <>
          <button className="btn btn-sm btn-outline-success" onClick={() => updateStatus(reservation.id, 'confirm')}>
            確認
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => updateStatus(reservation.id, 'cancel')}>
            取消
          </button>
        </>
      );
    }
    if (reservation.status === 'CANCEL_REQUESTED') {
      return (
        <>
          <button className="btn btn-sm btn-outline-danger" onClick={() => updateStatus(reservation.id, 'approveCancel')}>
            確認取消
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => updateStatus(reservation.id, 'rejectCancel')}>
            駁回
          </button>
        </>
      );
    }
    return <span className="text-muted small">無可用操作</span>;
  };

  return (
    <main className="container list-page">
      <div className="card shadow-sm border-0 overflow-hidden reservation-card">
        <div className="card-header bg-gradient text-white text-white-strong p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-calendar-check me-2"></i>今日預約管理</h4>
            <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
              <i className="bi bi-clock me-1"></i> {todayStr}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="p-3 border-bottom bg-white">
            <form onSubmit={applyFilters}>
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-3">
                  <label htmlFor="service" className="form-label">服務項目</label>
                  <select
                    id="service"
                    className="form-select"
                    value={filterDraft.service}
                    onChange={(e) => setFilterDraft({ ...filterDraft, service: e.target.value })}
                  >
                    <option value="">全部</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.name}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="status" className="form-label">預約狀態</label>
                  <select
                    id="status"
                    className="form-select"
                    value={filterDraft.status}
                    onChange={(e) => setFilterDraft({ ...filterDraft, status: e.target.value })}
                  >
                    <option value="">全部</option>
                    <option value="PENDING">待確認</option>
                    <option value="CONFIRMED">已確認</option>
                    <option value="CANCEL_REQUESTED">取消確認中</option>
                    <option value="CANCELLED">已取消</option>
                    <option value="COMPLETED">已完成</option>
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="keyword" className="form-label">關鍵字</label>
                  <input
                    id="keyword"
                    type="text"
                    className="form-control"
                    placeholder="姓名 / 電話 / 備註"
                    value={filterDraft.keyword}
                    onChange={(e) => setFilterDraft({ ...filterDraft, keyword: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3 d-flex gap-2">
                  <button type="submit" className="btn btn-gradient fw-bold shadow-sm w-100">查詢</button>
                  <button type="button" className="btn btn-outline-secondary fw-bold w-100" onClick={clearFilters}>清除</button>
                </div>
              </div>
            </form>
          </div>
          <div className="table-responsive desktop-table">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 text-start" style={{ width: '12%' }}>
                    <ReservationSortButton label="時間" field="startTime" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '15%' }}>
                    <ReservationSortButton label="客戶名稱" field="username" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '18%' }}>
                    <ReservationSortButton label="服務項目" field="title" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '25%' }}>
                    <ReservationSortButton label="客戶備註" field="remark" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center" style={{ width: '12%' }}>
                    <ReservationSortButton label="預約狀態" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center pe-4" style={{ width: '18%' }}>操作管理</th>
                </tr>
              </thead>
              <tbody>
                {content.map((res) => (
                  <tr key={res.id}>
                    <td className="ps-4 text-start fw-bold text-primary">{formatTimeHM(res.startTime)}</td>
                    <td className="text-start">{res.username}</td>
                    <td className="text-start"><span className="text-dark">{res.title}</span></td>
                    <td className="text-start">
                      <small className="text-muted text-break">{res.remark || '無備註'}</small>
                      {res.status === 'CANCEL_REQUESTED' ? (
                        <div className="mt-1">
                          <small className="text-danger text-break">
                            <i className="bi bi-exclamation-circle me-1"></i>取消原因：<span>{res.cancelReason}</span>
                          </small>
                        </div>
                      ) : null}
                    </td>
                    <td className="text-center"><ReservationStatusBadge status={res.status} /></td>
                    <td className="text-center pe-4">
                      {renderDesktopActions(res)}
                    </td>
                  </tr>
                ))}
                {content.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>目前尚無今日預約資料
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mobile-list p-3">
            {content.map((res) => (
              <div key={res.id} className="card mb-3 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold">{res.username}</div>
                    <div className="d-flex align-items-center gap-2">
                      <ReservationStatusBadge status={res.status} />
                      {renderMobileActions(res)}
                    </div>
                  </div>
                  <div className="small text-muted mb-1">時間：{formatTimeHM(res.startTime)}</div>
                  <div className="small text-muted mb-1">服務：{res.title}</div>
                  <div className="small text-muted mb-2">備註：{res.remark || '無備註'}</div>
                  {res.status === 'CANCEL_REQUESTED' ? (
                    <div className="small text-danger mb-2">取消原因：{res.cancelReason}</div>
                  ) : null}
                  <div className="d-flex gap-2"></div>
                </div>
              </div>
            ))}
            {content.length === 0 ? (
              <div className="text-center text-muted py-4">
                目前尚無今日預約資料
              </div>
            ) : null}
          </div>
        </div>

        <ReservationPaginationFooter size={size} setSize={setSize} setPage={setPage} page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
