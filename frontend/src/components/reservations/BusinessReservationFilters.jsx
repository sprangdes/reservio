import PropTypes from 'prop-types';

export default function BusinessReservationFilters({
  filterDraft,
  services,
  dateFromRef,
  dateToRef,
  statusLabel = '預約狀態',
  statusOptions,
  updateFilterDraft,
  applyFilters,
  clearFilters
}) {
  return (
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
            <label htmlFor="reservation-status" className="form-label">{statusLabel}</label>
            <select
              id="reservation-status"
              className="form-select"
              value={filterDraft.status}
              onChange={(e) => updateFilterDraft({ status: e.target.value })}
            >
              {statusOptions.map((option) => (
                <option key={option.value || '__empty'} value={option.value}>{option.label}</option>
              ))}
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
  );
}

BusinessReservationFilters.propTypes = {
  filterDraft: PropTypes.shape({
    dateFrom: PropTypes.string,
    dateTo: PropTypes.string,
    service: PropTypes.string,
    keyword: PropTypes.string,
    status: PropTypes.string
  }).isRequired,
  services: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired,
  dateFromRef: PropTypes.any,
  dateToRef: PropTypes.any,
  statusLabel: PropTypes.string,
  statusOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  updateFilterDraft: PropTypes.func.isRequired,
  applyFilters: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired
};
