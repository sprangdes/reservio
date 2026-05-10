import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { formatTimeHM } from '../utils/time';
import { useToast } from '../state/ToastContext';
import { useAuth } from '../state/AuthContext';
import ReservationStatusBadge from '../components/reservations/ReservationStatusBadge';
import ReservationSortButton from '../components/reservations/ReservationSortButton';
import ReservationPaginationFooter from '../components/reservations/ReservationPaginationFooter';
import { useReservationListControls } from '../hooks/useReservationListControls';

export default function MyReservationsPage() {
  const { setSuccessMessage, setErrorMessage } = useToast();
  const { me, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [filterDraft, setFilterDraft] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    businessId: '',
    service: '',
    keyword: ''
  });
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    businessId: '',
    service: '',
    keyword: ''
  });
  const [businessOptions, setBusinessOptions] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);
  const filterDraftRef = useRef(filterDraft);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('reservationDate');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    filterDraftRef.current = filterDraft;
  }, [filterDraft]);

  const updateFilterDraft = (patch) => {
    setFilterDraft({ ...filterDraftRef.current, ...patch });
  };

  useEffect(() => {
    if (!loading && me?.role === 'ROLE_BUSINESS') {
      navigate('/reservation/manage', { replace: true });
    }
  }, [loading, me, navigate]);

  const load = async () => {
    const condition = {
      startDate: filters.dateFrom || null,
      endDate: filters.dateTo || null,
      status: filters.status || null,
      businessId: filters.businessId || null,
      service: filters.service || null,
      keyword: filters.keyword || null
    };
    const res = await api.customerReservations({ page, size, sortBy, sortDir }, condition);
    setData(res.data || res || { content: [], totalPages: 0, totalElements: 0 });
  };

  useEffect(() => {
    void load();
  }, [page, size, sortBy, sortDir, filters]);

  useEffect(() => {
    if (!globalThis.flatpickr) return;
    const fpFrom = dateFromRef.current
      ? globalThis.flatpickr(dateFromRef.current, {
          locale: 'zh_tw',
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: (_, dateStr) => {
            updateFilterDraft({ dateFrom: dateStr });
            if (fpTo) {
              fpTo.set('minDate', dateStr || null);
            }
          }
        })
      : null;
    const fpTo = dateToRef.current
      ? globalThis.flatpickr(dateToRef.current, {
          locale: 'zh_tw',
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: (_, dateStr) => {
            updateFilterDraft({ dateTo: dateStr });
          }
        })
      : null;
    return () => {
      if (fpFrom) fpFrom.destroy();
      if (fpTo) fpTo.destroy();
    };
  }, []);

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const res = await api.customerReservedBusinesses();
        const items = res?.items || res?.data || res || [];
        setBusinessOptions(Array.isArray(items) ? items : []);
      } catch (err) {
        setErrorMessage(err.message || '載入商家清單失敗');
      }
    };
    void loadBusinesses();
  }, [setErrorMessage]);

  useEffect(() => {
    const loadServices = async () => {
      if (!filterDraft.businessId) {
        setServiceOptions([]);
        return;
      }
      try {
        const res = await api.businessServices(filterDraft.businessId);
        const items = res?.data || res?.items || res || [];
        setServiceOptions(Array.isArray(items) ? items : []);
      } catch (err) {
        setErrorMessage(err.message || '載入服務項目失敗');
      }
    };
    void loadServices();
  }, [filterDraft.businessId, setErrorMessage]);

  const handleCancel = async (id: string | number, reason?: string) => {
    try {
      await api.cancelReservation(id, reason ? { cancelReason: reason } : null);
      setSuccessMessage('已送出取消申請/取消成功');
      setCancelReason('');
      setSelectedId(null);
      const modalEl = document.getElementById('cancelModal');
      if (modalEl && globalThis.bootstrap) {
        const instance = globalThis.bootstrap.Modal.getInstance(modalEl);
        if (instance) {
          instance.hide();
        }
      }
      await load();
    } catch (err) {
      setErrorMessage(err.message || '取消失敗');
    }
  };

  const openModal = (id: string | number) => {
    setSelectedId(id);
    setCancelReason('');
    if (globalThis.bootstrap) {
      const modalEl = document.getElementById('cancelModal');
      const modal = new globalThis.bootstrap.Modal(modalEl);
      modal.show();
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
    const empty = { dateFrom: '', dateTo: '', status: '', businessId: '', service: '', keyword: '' };
    setFilterDraft(empty);
    setFilters(empty);
    setPage(0);
  };

  const totalPages = Math.max(data.totalPages || 0, 1);
  const content = useMemo(() => data.content || [], [data.content]);
  const renderDesktopActions = (reservation) => {
    if (reservation.status === 'PENDING') {
      return (
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => handleCancel(reservation.id)}>
            <i className="bi bi-x-lg"></i> 取消
          </button>
        </div>
      );
    }
    if (reservation.status === 'CONFIRMED') {
      return (
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => openModal(reservation.id)}>
            <i className="bi bi-x-lg"></i> 取消
          </button>
        </div>
      );
    }
    return <small className="text-muted">-</small>;
  };
  const renderMobileActions = (reservation) => {
    if (reservation.status === 'PENDING') {
      return (
        <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(reservation.id)}>
          取消
        </button>
      );
    }
    if (reservation.status === 'CONFIRMED') {
      return (
        <button className="btn btn-sm btn-outline-danger" onClick={() => openModal(reservation.id)}>
          取消
        </button>
      );
    }
    return <span className="text-muted small">無可用操作</span>;
  };

  return (
    <main className="container list-page">
      <div className="card shadow-sm border-0 overflow-hidden reservation-card">
        <div className="card-header bg-gradient text-white text-white-strong p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-person-check me-2"></i>我的預約</h4>
            <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
              <i className="bi bi-list-check me-1"></i> 共 {data.totalElements || 0} 筆
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="p-3 border-bottom bg-white">
            <form onSubmit={applyFilters}>
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-3">
                  <label htmlFor="startDate" className="form-label">開始日期</label>
                  <input
                    id="startDate"
                    type="text"
                    className="form-control bg-white"
                    placeholder="選擇開始日期"
                    ref={dateFromRef}
                    value={filterDraft.dateFrom}
                    onChange={(e) => updateFilterDraft({ dateFrom: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="endDate" className="form-label">結束日期</label>
                  <input
                    id="endDate"
                    type="text"
                    className="form-control bg-white"
                    placeholder="選擇結束日期"
                    ref={dateToRef}
                    value={filterDraft.dateTo}
                    onChange={(e) => updateFilterDraft({ dateTo: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="businessId" className="form-label">商家</label>
                  <select
                    id="businessId"
                    className="form-select"
                    value={filterDraft.businessId}
                    onChange={(e) => updateFilterDraft({ businessId: e.target.value })}
                  >
                    <option value="">全部</option>
                    {businessOptions.map((biz) => (
                      <option key={biz.id} value={biz.id}>
                        {biz.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="service" className="form-label">服務項目</label>
                  <select
                    id="service"
                    className="form-select"
                    value={filterDraft.service}
                    onChange={(e) => updateFilterDraft({ service: e.target.value })}
                    disabled={!filterDraft.businessId}
                  >
                    <option value="">{filterDraft.businessId ? '全部' : '請先選擇商家'}</option>
                    {serviceOptions.map((service) => (
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
                    onChange={(e) => updateFilterDraft({ status: e.target.value })}
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
                    placeholder="店家 / 服務 / 備註"
                    value={filterDraft.keyword}
                    onChange={(e) => updateFilterDraft({ keyword: e.target.value })}
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
                  <th className="ps-4 text-start" style={{ width: '18%' }}>
                    <ReservationSortButton label="店家" field="businessName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '12%' }}>
                    <ReservationSortButton label="日期" field="reservationDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '10%' }}>
                    <ReservationSortButton label="時間" field="startTime" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '16%' }}>
                    <ReservationSortButton label="服務項目" field="title" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center" style={{ width: '14%' }}>
                    <ReservationSortButton label="狀態" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '20%' }}>
                    <ReservationSortButton label="備註" field="remark" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center pe-4" style={{ width: '10%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {content.map((res) => (
                  <tr key={res.id}>
                    <td className="ps-4 text-start fw-bold">{res.businessName}</td>
                    <td className="text-start">{res.reservationDate}</td>
                    <td className="text-start fw-bold text-primary">{formatTimeHM(res.startTime)}</td>
                    <td className="text-start"><span className="text-dark">{res.title}</span></td>
                    <td className="text-center"><ReservationStatusBadge status={res.status} /></td>
                    <td className="text-start">
                      <small className="text-muted text-break">{res.remark || '無備註'}</small>
                    </td>
                    <td className="text-center pe-4">
                      {renderDesktopActions(res)}
                    </td>
                  </tr>
                ))}
                {content.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>目前尚無預約資料
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
                    <div className="fw-bold">{res.businessName}</div>
                    <div className="d-flex align-items-center gap-2">
                      <ReservationStatusBadge status={res.status} />
                      {renderMobileActions(res)}
                    </div>
                  </div>
                  <div className="small text-muted mb-1">日期：{res.reservationDate}</div>
                  <div className="small text-muted mb-1">時間：{formatTimeHM(res.startTime)}</div>
                  <div className="small text-muted mb-1">項目：{res.title}</div>
                  <div className="small text-muted mb-2">備註：{res.remark || '無備註'}</div>
                  <div className="d-flex gap-2"></div>
                </div>
              </div>
            ))}
            {content.length === 0 ? (
              <div className="text-center text-muted py-4">
                目前尚無預約資料
              </div>
            ) : null}
          </div>
        </div>

        <ReservationPaginationFooter size={size} setSize={setSize} setPage={setPage} page={page} totalPages={totalPages} />
      </div>

      <div className="modal fade" id="cancelModal" tabIndex={-1} aria-hidden="true">
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
                  rows={3}
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
