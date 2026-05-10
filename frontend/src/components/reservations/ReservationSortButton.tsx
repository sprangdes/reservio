interface Props {
  label: string;
  field: string;
  sortBy: string;
  sortDir: string;
  onSort: (field: string) => void;
}

export default function ReservationSortButton({ label, field, sortBy, sortDir, onSort }: Props) {
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
