import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

export default function ReservationPaginationFooter({ size, setSize, setPage, page, totalPages, backPath }) {
  return (
    <div className="card-footer bg-white py-3 border-top-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
      <Link to={backPath} className="btn btn-link btn-sm text-primary fw-bold text-decoration-none btn-back-link">
        <i className="bi bi-arrow-left me-1"></i> 返回儀表板
      </Link>
      <div className="d-flex align-items-center gap-2">
        <span className="text-muted small">每頁</span>
        <select
          className="form-select form-select-sm"
          value={size}
          onChange={(event) => {
            setSize(Number(event.target.value));
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
  );
}

ReservationPaginationFooter.propTypes = {
  size: PropTypes.number.isRequired,
  setSize: PropTypes.func.isRequired,
  setPage: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  backPath: PropTypes.string
};

ReservationPaginationFooter.defaultProps = {
  backPath: '/'
};
