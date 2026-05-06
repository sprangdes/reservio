import PropTypes from 'prop-types';
import { formatTimeHM } from '../../utils/time.js';
import ReservationCancelReason from './ReservationCancelReason.jsx';
import ReservationStatusBadge from './ReservationStatusBadge.jsx';
import ReservationActionControls from './ReservationActionControls.jsx';

export default function ReservationDesktopRow({ reservation, onAction }) {
  return (
    <tr>
      <td className="ps-4 text-start">{reservation.reservationDate}</td>
      <td className="text-start fw-bold text-primary">{formatTimeHM(reservation.startTime)}</td>
      <td className="text-start">{reservation.username}</td>
      <td className="text-start"><span className="text-dark">{reservation.title}</span></td>
      <td className="text-start">
        <small className="text-muted text-break">{reservation.remark || '無備註'}</small>
        <ReservationCancelReason status={reservation.status} cancelReason={reservation.cancelReason} />
      </td>
      <td className="text-center"><ReservationStatusBadge status={reservation.status} /></td>
      <td className="text-center pe-4">
        <ReservationActionControls
          status={reservation.status}
          reservationId={reservation.id}
          onAction={onAction}
        />
      </td>
    </tr>
  );
}

ReservationDesktopRow.propTypes = {
  reservation: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    reservationDate: PropTypes.string,
    startTime: PropTypes.string,
    username: PropTypes.string,
    title: PropTypes.string,
    remark: PropTypes.string,
    status: PropTypes.string,
    cancelReason: PropTypes.string
  }).isRequired,
  onAction: PropTypes.func.isRequired
};
