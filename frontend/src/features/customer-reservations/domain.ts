export type ReservationStatusKey = 'PENDING' | 'CONFIRMED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'COMPLETED' | 'UNKNOWN';
export type ReservationStatusCategory = 'attention' | 'confirmed' | 'terminal-destructive' | 'terminal-complete' | 'unknown';

export type ReservationStatusPresentation = Readonly<{ key: ReservationStatusKey; label: string; category: ReservationStatusCategory }>;

export type ReservationSummary = Readonly<{
  id: string;
  businessId: string | null;
  businessName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatusKey;
  remark: string | null;
  cancelReason: string | null;
}>;

export type ReservationPage = Readonly<{ items: ReservationSummary[]; page: number; size: number; totalPages: number; totalElements: number }>;
