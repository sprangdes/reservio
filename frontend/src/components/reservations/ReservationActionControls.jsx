import PropTypes from 'prop-types';

function renderButtonLabel(iconClass, text, withIcon) {
  if (!withIcon) return text;
  return (
    <>
      <i className={iconClass}></i> {text}
    </>
  );
}

export default function ReservationActionControls({ status, reservationId, onAction, compact }) {
  const withIcon = !compact;
  const confirmClass = compact ? 'btn btn-sm btn-outline-success' : 'btn btn-sm btn-outline-success px-3';
  const cancelClass = compact ? 'btn btn-sm btn-outline-danger' : 'btn btn-sm btn-outline-danger px-3';
  const rejectClass = compact ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-outline-secondary px-3';

  if (status === 'PENDING') {
    const actions = (
      <>
        <button className={confirmClass} onClick={() => onAction(reservationId, 'confirm')}>
          {renderButtonLabel('bi bi-check-lg', '確認', withIcon)}
        </button>
        <button className={cancelClass} onClick={() => onAction(reservationId, 'cancel')}>
          {renderButtonLabel('bi bi-x-lg', '取消', withIcon)}
        </button>
      </>
    );
    return compact ? actions : <div className="d-flex gap-2 justify-content-center">{actions}</div>;
  }

  if (status === 'CANCEL_REQUESTED') {
    const actions = (
      <>
        <button className={cancelClass} onClick={() => onAction(reservationId, 'approveCancel')}>
          {renderButtonLabel('bi bi-x-circle me-1', '確認取消', withIcon)}
        </button>
        <button className={rejectClass} onClick={() => onAction(reservationId, 'rejectCancel')}>
          {renderButtonLabel('bi bi-arrow-counterclockwise me-1', '駁回', withIcon)}
        </button>
      </>
    );
    return compact ? actions : <div className="d-flex gap-2 justify-content-center">{actions}</div>;
  }

  return compact ? <span className="text-muted small">無可用操作</span> : <small className="text-muted">無可用操作</small>;
}

ReservationActionControls.propTypes = {
  status: PropTypes.string.isRequired,
  reservationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onAction: PropTypes.func.isRequired,
  compact: PropTypes.bool
};

ReservationActionControls.defaultProps = {
  compact: false
};
