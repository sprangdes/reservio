import { useMemo } from 'react';
import ReservationPaginationFooter from '../components/reservations/ReservationPaginationFooter.jsx';
import BusinessReservationFilters from '../components/reservations/BusinessReservationFilters.jsx';
import BusinessReservationList from '../components/reservations/BusinessReservationList.jsx';
import { useBusinessReservationList } from '../hooks/useBusinessReservationList.js';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'PENDING', label: '待確認' },
  { value: 'CONFIRMED', label: '已確認' },
  { value: 'CANCEL_REQUESTED', label: '取消確認中' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'COMPLETED', label: '已完成' }
];

export default function ManageAllPage() {
  const {
    data,
    services,
    filterDraft,
    dateFromRef,
    dateToRef,
    page,
    setPage,
    size,
    setSize,
    sortBy,
    sortDir,
    updateFilterDraft,
    updateStatus,
    handleSort,
    applyFilters,
    clearFilters
  } = useBusinessReservationList({ initialSortDir: 'desc', defaultStatus: '' });

  const totalPages = Math.max(data.totalPages || 0, 1);
  const content = useMemo(() => data.content || [], [data.content]);

  return (
    <main className="container list-page">
      <div className="card shadow-sm border-0 overflow-hidden reservation-card">
        <div className="card-header bg-gradient text-white text-white-strong p-4">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 fw-bold"><i className="bi bi-journal-text me-2"></i>全部預約管理</h4>
            <span className="badge bg-white bg-opacity-25 fs-6 fw-normal">
              <i className="bi bi-list-check me-1"></i> 共 {data.totalElements || 0} 筆
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <BusinessReservationFilters
            filterDraft={filterDraft}
            services={services}
            dateFromRef={dateFromRef}
            dateToRef={dateToRef}
            statusOptions={STATUS_OPTIONS}
            updateFilterDraft={updateFilterDraft}
            applyFilters={applyFilters}
            clearFilters={clearFilters}
          />
          <BusinessReservationList
            content={content}
            sortBy={sortBy}
            sortDir={sortDir}
            handleSort={handleSort}
            updateStatus={updateStatus}
            statusColumnLabel="狀態"
            actionColumnLabel="操作"
            emptyDesktopText="目前尚無預約資料"
            emptyMobileText="目前尚無預約資料"
          />
        </div>

        <ReservationPaginationFooter size={size} setSize={setSize} setPage={setPage} page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
