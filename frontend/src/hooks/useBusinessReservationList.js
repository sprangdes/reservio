import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../state/ToastContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useAsyncEffect } from './useAsyncEffect.js';
import { useReservationManagementControls } from './useReservationManagementControls.js';

const DEFAULT_EMPTY_FILTERS = { dateFrom: '', dateTo: '', service: '', keyword: '', status: '' };

export function useBusinessReservationList({ initialSortDir = 'desc', defaultStatus = null }) {
  const { me } = useAuth();
  const { setSuccessMessage, setErrorMessage } = useToast();
  const emptyFilters = useMemo(() => ({ ...DEFAULT_EMPTY_FILTERS }), []);
  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [services, setServices] = useState([]);
  const [filterDraft, setFilterDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const filterDraftRef = useRef(filterDraft);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('reservationDate');
  const [sortDir, setSortDir] = useState(initialSortDir);

  useEffect(() => {
    filterDraftRef.current = filterDraft;
  }, [filterDraft]);

  const updateFilterDraft = (patch) => {
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
      const res = await api.businessReservations({ page, size, sortBy, sortDir }, condition);
      setData(res.data || res || { content: [], totalPages: 0, totalElements: 0 });
    } catch (err) {
      setErrorMessage(err.message || '載入失敗');
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
