export type BackendReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'COMPLETED';
export type ReservationStatusKey = BackendReservationStatus | 'REJECTED' | 'UNKNOWN';
export type ReservationSemanticTone = 'warning' | 'success' | 'danger' | 'neutral' | 'info';
export type ReservationAction = 'viewDetails' | 'confirm' | 'cancel' | 'inspectCancellationReason' | 'approveCancellation' | 'rejectCancellation' | 'retryMutation';
export type Availability = 'available' | 'derived' | 'partial' | 'unsupported' | 'future';
export type ReservationViewPreset = 'today' | 'pending' | 'all' | 'calendar';
export type ReservationCalendarViewMode = 'day' | 'week' | 'month';
export type ReservationSortField = 'reservationDate' | 'startTime' | 'username' | 'title' | 'remark' | 'status' | 'businessName';
export type ReservationSortDirection = 'asc' | 'desc';
export type QuerySupport = 'backend-supported' | 'frontend-derived' | 'future-capability' | 'unsupported';

export interface FieldValue<T> { value?: T; availability: Availability; }

export interface ReservationCenterItem {
  id: string | number;
  backendStatus: string;
  status: ReservationStatusKey;
  customerName: FieldValue<string>;
  customerPhone: FieldValue<string>;
  serviceName: FieldValue<string>;
  reservationDate: FieldValue<string>;
  startTime: FieldValue<string>;
  endTime: FieldValue<string>;
  durationMinutes: FieldValue<number>;
  remark: FieldValue<string>;
  createdAt: FieldValue<string>;
  updatedAt: FieldValue<string>;
  cancellationReason: FieldValue<string>;
  rejectionReason: FieldValue<string>;
  staffOrResource: FieldValue<string>;
  notificationContext: FieldValue<{ unread: boolean }>;
  detailsAvailability: 'partial' | 'complete' | 'unavailable';
}

export interface ReservationStatusPresentation {
  key: ReservationStatusKey;
  label: string;
  tone: ReservationSemanticTone;
  icon: string;
  terminal: boolean;
  source: 'backend' | 'future' | 'unknown';
  includedIn: Readonly<Record<ReservationViewPreset, boolean>>;
}

export interface ReservationActionCapability { action: ReservationAction; availability: 'available' | 'disabled' | 'future'; reason?: string; }
export type ReservationActionCapabilities = Readonly<Record<ReservationAction, ReservationActionCapability>>;

export interface ReservationFilter { dateFrom: string; dateTo: string; statuses: ReservationStatusKey[]; service: string; keyword: string; resourceId?: string; }
export interface ReservationSort { field: ReservationSortField; direction: ReservationSortDirection; }
export interface ReservationQuery {
  preset: ReservationViewPreset;
  filter: ReservationFilter;
  sort: ReservationSort;
  page: number;
  pageSize: number;
  calendarView: ReservationCalendarViewMode;
}

export interface ReservationPageResult { items: ReservationCenterItem[]; page: number; pageSize: number; totalPages: number; totalCount: number; hasNextPage: boolean; }
export interface ReservationCalendarEvent {
  id: string | number;
  item: ReservationCenterItem;
  date: string;
  startMinutes?: number;
  endMinutes?: number;
  durationMinutes?: number;
  hasExplicitEnd: boolean;
}
export interface ReservationCalendarState { selectedDate: string; mode: ReservationCalendarViewMode; result: ReservationPageResult | null; loadState: ReservationLoadState; requestKey: string; }
export interface ReservationPaginationState { page: number; totalPages: number; totalCount: number; pageSize: number; hasPreviousPage: boolean; hasNextPage: boolean; }
export interface MobileReservationPageState { items: ReservationCenterItem[]; nextPage: number; hasMore: boolean; isLoadingMore: boolean; error: Error | null; queryKey: string; }
export type ReservationLoadPhase = 'idle' | 'initial-loading' | 'ready' | 'refreshing' | 'empty' | 'filter-empty' | 'query-error' | 'loading-more' | 'load-more-error';
export interface ReservationLoadState { phase: ReservationLoadPhase; error: Error | null; hasStaleData: boolean; }
export type ReservationMutationPhase = 'idle' | 'pending' | 'success' | 'error' | 'stale';
export interface ReservationMutationState { phase: ReservationMutationPhase; reservationId?: string | number; action?: ReservationAction; error: Error | null; updatedAt?: number; }

export interface ReservationCapability { key: 'resourceScheduling' | 'advancedSearch' | 'bulkActions' | 'export' | 'reports' | 'messageCenter' | 'lineIntegrationHealth'; state: 'unavailable' | 'preview' | 'enabled'; }
export interface ReservationDetailsSelection { id: string | number; item: ReservationCenterItem; availability: ReservationCenterItem['detailsAvailability']; }
export interface BackendReservationQuery { page: number; size: number; sortBy: ReservationSortField; sortDir: ReservationSortDirection; condition: { startDate: string | null; endDate: string | null; service: string | null; keyword: string | null; status: string | null; }; }
export interface ReservationApiResponse { content?: unknown[]; totalPages?: number; totalElements?: number; number?: number; size?: number; }
export interface ReservationCenterAdapter { query(query: ReservationQuery): Promise<ReservationPageResult>; mutate(id: string | number, action: Exclude<ReservationAction, 'viewDetails' | 'inspectCancellationReason' | 'retryMutation'>): Promise<unknown>; }
