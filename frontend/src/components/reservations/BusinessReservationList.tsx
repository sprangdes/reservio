import ReservationSortButton from './ReservationSortButton';
import ReservationDesktopRow from './ReservationDesktopRow';
import ReservationMobileCard from './ReservationMobileCard';
import type { ReservationItem } from './types';

interface Props {
  content: ReservationItem[];
  sortBy: string;
  sortDir: string;
  handleSort: (field: string) => void;
  updateStatus: (id: string | number, action: string) => void | Promise<void>;
  statusColumnLabel?: string;
  actionColumnLabel?: string;
  emptyDesktopText?: string;
  emptyMobileText?: string;
}

export default function BusinessReservationList({ content, sortBy, sortDir, handleSort, updateStatus, statusColumnLabel = '狀態', actionColumnLabel = '操作', emptyDesktopText = '目前尚無預約資料', emptyMobileText = '目前尚無預約資料' }: Readonly<Props>) {
  return <>
    <div className="table-responsive desktop-table">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr>
          <th className="ps-4 text-start" style={{ width: '12%' }}><ReservationSortButton label="日期" field="reservationDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
          <th className="text-start" style={{ width: '10%' }}><ReservationSortButton label="時間" field="startTime" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
          <th className="text-start" style={{ width: '14%' }}><ReservationSortButton label="客戶名稱" field="username" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
          <th className="text-start" style={{ width: '14%' }}><ReservationSortButton label="服務項目" field="title" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
          <th className="text-start" style={{ width: '26%' }}><ReservationSortButton label="客戶備註" field="remark" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
          <th className="text-center" style={{ width: '10%' }}><ReservationSortButton label={statusColumnLabel} field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
          <th className="text-center pe-4" style={{ width: '14%' }}>{actionColumnLabel}</th>
        </tr></thead>
        <tbody>
          {content.map((reservation) => <ReservationDesktopRow key={reservation.id} reservation={reservation} onAction={updateStatus} />)}
          {content.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-5"><i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>{emptyDesktopText}</td></tr> : null}
        </tbody>
      </table>
    </div>
    <div className="mobile-list p-3">
      {content.map((reservation) => <ReservationMobileCard key={reservation.id} reservation={reservation} onAction={updateStatus} />)}
      {content.length === 0 ? <div className="text-center text-muted py-4">{emptyMobileText}</div> : null}
    </div>
  </>;
}
