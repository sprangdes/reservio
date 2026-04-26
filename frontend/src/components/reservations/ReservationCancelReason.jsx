import PropTypes from 'prop-types';

export default function ReservationCancelReason({ status, cancelReason, compact }) {
  if (status !== 'CANCEL_REQUESTED') return null;

  if (compact) {
    return <div className="small text-danger mb-2">取消原因：{cancelReason}</div>;
  }

  return (
    <div className="mt-1">
      <small className="text-danger text-break">
        <i className="bi bi-exclamation-circle me-1"></i>取消原因：<span>{cancelReason}</span>
      </small>
    </div>
  );
}

ReservationCancelReason.propTypes = {
  status: PropTypes.string.isRequired,
  cancelReason: PropTypes.string,
  compact: PropTypes.bool
};

ReservationCancelReason.defaultProps = {
  cancelReason: '',
  compact: false
};
