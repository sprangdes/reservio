import { useEffect } from 'react';
import {
  getNextSortState,
  loadBusinessActiveServices,
  updateBusinessReservationStatus
} from '../utils/reservationManagement';
import type { Dispatch, SetStateAction } from 'react';
import type { ServiceOption } from '../components/reservations/types';

type SortDir = 'asc' | 'desc';

interface FilterDraft {
  dateFrom: string;
  dateTo: string;
  service: string;
  keyword: string;
  status: string;
}

interface ControlsParams {
  me: { business?: { id?: string | number } } | null;
  apiClient: {
    businessActiveServices: (id: string | number) => Promise<unknown>;
    updateReservationStatus: (id: string | number, payload: { action: string }) => Promise<{ message?: string }>;
  };
  dateFromRef: { current: HTMLInputElement | null };
  dateToRef: { current: HTMLInputElement | null };
  updateFilterDraft: (patch: Partial<FilterDraft>) => void;
  setServices: Dispatch<SetStateAction<ServiceOption[]>>;
  setErrorMessage: (message: string) => void;
  setSuccessMessage: (message: string) => void;
  load: () => Promise<void>;
  sortBy: string;
  sortDir: SortDir;
  setSortBy: (value: string) => void;
  setSortDir: (value: SortDir) => void;
  setPage: (value: number | ((prev: number) => number)) => void;
  filterDraft: FilterDraft;
  setFilters: (value: FilterDraft) => void;
  setFilterDraft: (value: FilterDraft) => void;
  emptyFilters: FilterDraft;
}

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
}: ControlsParams) {
  useEffect(() => {
    const loadServices = async () => {
      try {
        const businessId = me?.business?.id;
        if (!businessId) return;
        const items = await loadBusinessActiveServices(apiClient, businessId);
        setServices(items);
      } catch (err) {
        const error = err as Error;
        setErrorMessage(error.message || '載入服務項目失敗');
      }
    };
    void loadServices();
  }, [me, apiClient, setServices, setErrorMessage]);

  useEffect(() => {
    if (!(globalThis as any).flatpickr) return;
    const fpFrom = dateFromRef.current
      ? (globalThis as any).flatpickr(dateFromRef.current, {
          locale: 'zh_tw',
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: (_: unknown, dateStr: string) => {
            updateFilterDraft({ dateFrom: dateStr });
            if (fpTo) {
              fpTo.set('minDate', dateStr || null);
            }
          }
        })
      : null;
    const fpTo = dateToRef.current
      ? (globalThis as any).flatpickr(dateToRef.current, {
          locale: 'zh_tw',
          dateFormat: 'Y-m-d',
          disableMobile: true,
          onChange: (_: unknown, dateStr: string) => {
            updateFilterDraft({ dateTo: dateStr });
          }
        })
      : null;
    return () => {
      if (fpFrom) fpFrom.destroy();
      if (fpTo) fpTo.destroy();
    };
  }, [dateFromRef, dateToRef, updateFilterDraft]);

  const updateStatus = async (id: string | number, action: string) => {
    try {
      const res = await updateBusinessReservationStatus(apiClient, id, action);
      setSuccessMessage((res as { message?: string }).message || '更新成功');
      await load();
    } catch (err) {
      const error = err as Error;
      setErrorMessage(error.message || '更新失敗');
    }
  };

  const handleSort = (field: string) => {
    const nextSort = getNextSortState(sortBy, sortDir, field) as { sortBy: string; sortDir: SortDir };
    setSortBy(nextSort.sortBy);
    setSortDir(nextSort.sortDir);
    setPage(0);
  };

  const applyFilters = (event: { preventDefault: () => void }) => {
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
