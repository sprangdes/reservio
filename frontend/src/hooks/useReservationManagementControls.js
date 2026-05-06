import { useEffect } from 'react';
import {
  getNextSortState,
  loadBusinessActiveServices,
  updateBusinessReservationStatus
} from '../utils/reservationManagement.js';

export function useReservationManagementControls({
  me,
  apiClient,
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
}) {
  useEffect(() => {
    const loadServices = async () => {
      try {
        const businessId = me?.business?.id;
        if (!businessId) return;
        const items = await loadBusinessActiveServices(apiClient, businessId);
        setServices(items);
      } catch (err) {
        setErrorMessage(err.message || '載入服務項目失敗');
      }
    };
    void loadServices();
  }, [me, apiClient, setServices, setErrorMessage]);

  useEffect(() => {
    if (!globalThis.flatpickr) return;
    const fpFrom = dateFromRef.current
      ? globalThis.flatpickr(dateFromRef.current, {
          locale: 'zh_tw',
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: (_, dateStr) => {
            updateFilterDraft({ dateFrom: dateStr });
            if (fpTo) {
              fpTo.set('minDate', dateStr || null);
            }
          }
        })
      : null;
    const fpTo = dateToRef.current
      ? globalThis.flatpickr(dateToRef.current, {
          locale: 'zh_tw',
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: (_, dateStr) => {
            updateFilterDraft({ dateTo: dateStr });
          }
        })
      : null;
    return () => {
      if (fpFrom) fpFrom.destroy();
      if (fpTo) fpTo.destroy();
    };
  }, []);

  const updateStatus = async (id, action) => {
    try {
      const res = await updateBusinessReservationStatus(apiClient, id, action);
      setSuccessMessage(res.message || '更新成功');
      await load();
    } catch (err) {
      setErrorMessage(err.message || '更新失敗');
    }
  };

  const handleSort = (field) => {
    const nextSort = getNextSortState(sortBy, sortDir, field);
    setSortBy(nextSort.sortBy);
    setSortDir(nextSort.sortDir);
    setPage(0);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({ ...filterDraft });
    setPage(0);
  };

  const clearFilters = () => {
    setFilterDraft(emptyFilters);
    setFilters(emptyFilters);
    setPage(0);
  };

  return {
    updateStatus,
    handleSort,
    applyFilters,
    clearFilters
  };
}
