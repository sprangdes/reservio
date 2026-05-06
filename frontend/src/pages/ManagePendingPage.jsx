import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import ReservationSortButton from '../components/reservations/ReservationSortButton.jsx';
import ReservationPaginationFooter from '../components/reservations/ReservationPaginationFooter.jsx';
import ReservationDesktopRow from '../components/reservations/ReservationDesktopRow.jsx';
import ReservationMobileCard from '../components/reservations/ReservationMobileCard.jsx';
import { useAsyncEffect } from '../hooks/useAsyncEffect.js';
import { useReservationManagementControls } from '../hooks/useReservationManagementControls.js';

export default function ManagePendingPage() {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const emptyFilters = useMemo(
    () => ({ dateFrom: '', dateTo: '', service: '', keyword: '', status: '' }),
    []
  );
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [services, setServices] = useState([]);
  const [filterDraft, setFilterDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const filterDraftRef = useRef(filterDraft);
  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('reservationDate');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    filterDraftRef.current = filterDraft;
  }, [filterDraft]);

  const updateFilterDraft = (patch) => {
    setFilterDraft({ ...filterDraftRef.current, ...patch });
  };

  const load = async () => {
    try {
      const condition = {
        startDate: filters.dateFrom || null,
        endDate: filters.dateTo || null,
        service: filters.service || null,
        keyword: filters.keyword || null,
        status: filters.status ? filters.status : 'PENDING,CANCEL_REQUESTED'
      };
      const res = await api.businessReservations({ page, size, sortBy, sortDir }, condition);
      setData(res.data || res || { content: [], totalPages: 0, totalElements: 0 });
    } catch (err) {
      setErrorMessage(err.message || '載入失敗');
    }
  };

  useAsyncEffect(load, [page, size, sortBy, sortDir, filters]);

  const { updateStatus, handleSort, applyFilters, clearFilters } = useReservationManagementControls({
    me,
    apiClient: api,
    dateFromRef,
    dateToRef,
    updateFilterDraft,
    setServices,
    setErrorMessage,
    setSuccessMessage,
    load,
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
    setPage,
    filterDraft,
    setFilters,
    setFilterDraft,
    emptyFilters
  });

  const totalPages = Math.max(data.totalPages || 0, 1);
  const content = useMemo(() => data.content || [], [data.content]);

  return (
    <main className="container list-page">
      <div className="card shadow-sm border-0 overflow-hidden reservation-card">
        <div className="card-header bg-gradient text-white text-white-strong p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-hourglass-split me-2"></i>待處理預約管理</h4>
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
                  <label htmlFor="start-date" className="form-label">開始日期</label>
                  <input
                    id="start-date"
                    type="text"
                    className="form-control bg-white"
                    placeholder="選擇開始日期"
                    ref={dateFromRef}
                    value={filterDraft.dateFrom}
                    onChange={(e) => updateFilterDraft({ dateFrom: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="end-date" className="form-label">結束日期</label>
                  <input
                    id="end-date"
                    type="text"
                    className="form-control bg-white"
                    placeholder="選擇結束日期"
                    ref={dateToRef}
                    value={filterDraft.dateTo}
                    onChange={(e) => updateFilterDraft({ dateTo: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="service-item" className="form-label">服務項目</label>
                  <select
                    id="service-item"
                    className="form-select"
                    value={filterDraft.service}
                    onChange={(e) => updateFilterDraft({ service: e.target.value })}
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
                  <label htmlFor="reservation-status" className="form-label">預約狀態</label>
                  <select
                    id="reservation-status"
                    className="form-select"
                    value={filterDraft.status}
                    onChange={(e) => updateFilterDraft({ status: e.target.value })}
                  >
                    <option value="">全部（待處理）</option>
                    <option value="PENDING">待確認</option>
                    <option value="CANCEL_REQUESTED">取消確認中</option>
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="search-keyword" className="form-label">關鍵字</label>
                  <input
                    id="search-keyword"
                    type="text"
                    className="form-control"
                    placeholder="姓名 / 電話 / 備註"
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
                  <th className="ps-4 text-start" style={{ width: '12%' }}>
                    <ReservationSortButton label="日期" field="reservationDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '10%' }}>
                    <ReservationSortButton label="時間" field="startTime" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '14%' }}>
                    <ReservationSortButton label="客戶名稱" field="username" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '14%' }}>
                    <ReservationSortButton label="服務項目" field="title" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-start" style={{ width: '26%' }}>
                    <ReservationSortButton label="客戶備註" field="remark" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center" style={{ width: '10%' }}>
                    <ReservationSortButton label="預約狀態" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-center pe-4" style={{ width: '14%' }}>操作管理</th>
                </tr>
              </thead>
              <tbody>
                {content.map((res) => (
                  <ReservationDesktopRow key={res.id} reservation={res} onAction={updateStatus} />
                ))}
                {content.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-5">
                      <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>目前沒有待處理預約
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mobile-list p-3">
            {content.map((res) => (
              <ReservationMobileCard key={res.id} reservation={res} onAction={updateStatus} />
            ))}
            {content.length === 0 ? (
              <div className="text-center text-muted py-4">
                目前沒有待處理預約
              </div>
            ) : null}
          </div>
        </div>

        <ReservationPaginationFooter size={size} setSize={setSize} setPage={setPage} page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
