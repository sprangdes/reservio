import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useAsyncEffect } from './useAsyncEffect.js';
import { useReservationManagementControls } from './useReservationManagementControls.js';

type SortDir = 'asc' | 'desc';

interface FilterDraft {
  dateFrom: string;
  dateTo: string;
  service: string;
  keyword: string;
  status: string;
}

interface ReservationListData {
  content: unknown[];
  totalPages: number;
  totalElements: number;
}

const DEFAULT_EMPTY_FILTERS: FilterDraft = { dateFrom: '', dateTo: '', service: '', keyword: '', status: '' };

export function useBusinessReservationList({
  initialSortDir = 'desc',
  defaultStatus = ''
}: {
  initialSortDir?: SortDir;
  defaultStatus?: string;
}) {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const emptyFilters = useMemo(() => ({ ...DEFAULT_EMPTY_FILTERS }), []);
  const dateFromRef = useRef<HTMLInputElement | null>(null);
  const dateToRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<ReservationListData>({ content: [], totalPages: 0, totalElements: 0 });
  const [services, setServices] = useState<unknown[]>([]);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(emptyFilters);
  const [filters, setFilters] = useState<FilterDraft>(emptyFilters);
  const filterDraftRef = useRef(filterDraft);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('reservationDate');
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);

  useEffect(() => {
    filterDraftRef.current = filterDraft;
  }, [filterDraft]);

  const updateFilterDraft = (patch: Partial<FilterDraft>) => {
    setFilterDraft({ ...filterDraftRef.current, ...patch });
  };

  const load = async () => {
    try {
      const condition = {
        startDate: filters.dateFrom || null,
        endDate: filters.dateTo || null,
        service: filters.service || null,
        keyword: filters.keyword || null,
        status: filters.status || defaultStatus
      };
      const res = (await api.businessReservations({ page, size, sortBy, sortDir }, condition)) as
        | { data?: ReservationListData }
        | ReservationListData
        | null;
      setData((res as { data?: ReservationListData })?.data || (res as ReservationListData) || { content: [], totalPages: 0, totalElements: 0 });
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '載入失敗');
    }
  };

  useAsyncEffect(load, [page, size, sortBy, sortDir, filters]);

  const { updateStatus, handleSort, applyFilters, clearFilters } = useReservationManagementControls({
    me,
    apiClient: api,
    dateFromRef,
    dateToRef,
    updateFilterDraft,
    setServices,
    setErrorMessage,
    setSuccessMessage,
    load,
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
    setPage,
    filterDraft,
    setFilters,
    setFilterDraft,
    emptyFilters
  });

  return {
    data,
    services,
    filterDraft,
    dateFromRef,
    dateToRef,
    page,
    setPage,
    size,
    setSize,
    sortBy,
    sortDir,
    updateFilterDraft,
    updateStatus,
    handleSort,
    applyFilters,
    clearFilters
  };
}
