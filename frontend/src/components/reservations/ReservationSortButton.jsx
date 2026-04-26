import PropTypes from 'prop-types';

export default function ReservationSortButton({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  let icon = 'bi bi-arrow-down-up';
  if (active) {
    icon = sortDir === 'asc' ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill';
  }
  return (
    <button type="button" className="btn btn-link p-0 text-decoration-none text-dark" onClick={() => onSort(field)}>
      {label} <i className={icon}></i>
    </button>
  );
}

ReservationSortButton.propTypes = {
  label: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired
};
