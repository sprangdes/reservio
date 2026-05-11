export type KnownReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'COMPLETED';
export type ReservationStatus = KnownReservationStatus | (string & {});

export interface ReservationItem {
  id: string | number;
  reservationDate?: string;
  startTime?: string;
  username?: string;
  businessName?: string;
  title?: string;
  remark?: string;
  status: ReservationStatus;
  cancelReason?: string;
  [key: string]: unknown;
}

export interface ServiceOption {
  id: string | number;
  name: string;
}

export interface FilterDraft {
  dateFrom: string;
  dateTo: string;
  service: string;
  keyword: string;
  status: string;
}
