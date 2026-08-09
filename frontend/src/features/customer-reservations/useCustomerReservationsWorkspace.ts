import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import { normalizeService } from '../customer-booking/normalizers';
import { createRequestGuard, isIntentionalAbort } from '../customer-booking/requestGuards';
import { normalizeReservationPage } from './normalizers';
import { mapCustomerReservationQuery } from './query';
import type { ReservationPage } from './domain';
import type { ReservationFilterDraft } from './ReservationFilters';

type LoadState = 'loading' | 'ready' | 'error';
type Option = Readonly<{ id: string; name: string }>;
const emptyPage: ReservationPage = { items: [], page: 0, size: 10, totalPages: 0, totalElements: 0 };
export const emptyReservationFilterDraft: ReservationFilterDraft = { dateFrom: '', dateTo: '', businessId: '', service: '', status: '', keyword: '', sortBy: 'reservationDate', sortDir: 'desc' };

function dataOf(value: unknown): unknown { return value && typeof value === 'object' && 'data' in value ? (value as { data: unknown }).data : value; }
function option(value: unknown): Option | null { if (!value || typeof value !== 'object') return null; const source = value as Record<string, unknown>; const id = typeof source.id === 'string' || typeof source.id === 'number' ? String(source.id) : null; const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim() : null; return id && name ? { id, name } : null; }

export function useCustomerReservationsWorkspace() {
  const [page, setPage] = useState<ReservationPage | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [stale, setStale] = useState(false);
  const [draft, setDraft] = useState<ReservationFilterDraft>(emptyReservationFilterDraft);
  const [applied, setApplied] = useState<ReservationFilterDraft>(emptyReservationFilterDraft);
  const [pageIndex, setPageIndex] = useState(0);
  const [businesses, setBusinesses] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(false);
  const queryGuard = useRef(createRequestGuard());
  const businessGuard = useRef(createRequestGuard());
  const serviceGuard = useRef(createRequestGuard());
  const sectionRef = useRef<HTMLHeadingElement>(null);
  const focusAfterPageLoad = useRef(false);
  const pageRef = useRef<ReservationPage | null>(null);

  useEffect(() => { pageRef.current = page; }, [page]);

  const loadReservations = useCallback(async (focusSection = false) => {
    const request = queryGuard.current.begin();
    setLoadState('loading');
    const condition = { startDate: applied.dateFrom || null, endDate: applied.dateTo || null, status: applied.status || null, businessId: applied.businessId || null, service: applied.service || null, keyword: applied.keyword || null };
    try {
      const response = await api.customerReservations(mapCustomerReservationQuery({ page: pageIndex, size: 10, sortBy: applied.sortBy, sortDir: applied.sortDir, condition }).params, condition, { signal: request.signal });
      if (!queryGuard.current.isCurrent(request)) return;
      const normalized = normalizeReservationPage(response);
      if (!normalized) throw new Error('Invalid reservation page');
      setPage(normalized); setStale(false); setLoadState('ready');
      if (focusSection || focusAfterPageLoad.current) {
        focusAfterPageLoad.current = false;
        queueMicrotask(() => sectionRef.current?.focus());
      }
    } catch (error) {
      if (!queryGuard.current.isCurrent(request) || isIntentionalAbort(error)) return;
      setLoadState('error');
      setStale(Boolean(pageRef.current));
    }
  }, [applied, pageIndex]);

  const loadBusinesses = useCallback(async () => {
    const request = businessGuard.current.begin();
    try {
      const response = await api.customerReservedBusinesses({ signal: request.signal });
      if (!businessGuard.current.isCurrent(request)) return;
      const raw = dataOf(response);
      setBusinesses(Array.isArray(raw) ? raw.flatMap((item) => { const normalized = option(item); return normalized ? [normalized] : []; }) : []);
    } catch (error) { if (!businessGuard.current.isCurrent(request) || isIntentionalAbort(error)) return; setBusinesses([]); }
  }, []);

  const loadServices = useCallback(async (businessId: string) => {
    if (!businessId) { serviceGuard.current.abort(); setServices([]); setServicesLoading(false); setServicesError(false); return; }
    const request = serviceGuard.current.begin(); setServicesLoading(true); setServicesError(false);
    try {
      const response = await api.businessServices(businessId, { signal: request.signal });
      if (!serviceGuard.current.isCurrent(request)) return;
      const raw = dataOf(response);
      setServices(Array.isArray(raw) ? raw.flatMap((item) => { const service = normalizeService(item); return service ? [{ id: service.id, name: service.name }] : []; }) : []);
    } catch (error) { if (!serviceGuard.current.isCurrent(request) || isIntentionalAbort(error)) return; setServices([]); setServicesError(true); }
    finally { if (serviceGuard.current.isCurrent(request)) setServicesLoading(false); }
  }, []);

  useEffect(() => { void loadReservations(); }, [loadReservations]);
  useEffect(() => { void loadBusinesses(); return () => businessGuard.current.dispose(); }, [loadBusinesses]);
  useEffect(() => { void loadServices(draft.businessId); }, [draft.businessId, loadServices]);
  useEffect(() => () => { queryGuard.current.dispose(); serviceGuard.current.dispose(); }, []);

  const changeDraft = useCallback((patch: Partial<ReservationFilterDraft>) => setDraft((current) => ({ ...current, ...patch })), []);
  const applyFilters = useCallback(() => { setPageIndex(0); setApplied(draft); }, [draft]);
  const clearFilters = useCallback(() => { setPageIndex(0); setDraft(emptyReservationFilterDraft); setApplied(emptyReservationFilterDraft); }, []);
  const changePage = useCallback((next: number) => { if (next === pageIndex || next < 0 || (page && next >= page.totalPages)) return; focusAfterPageLoad.current = true; setPageIndex(next); }, [page, pageIndex]);

  return useMemo(() => ({ page: page || emptyPage, hasLoadedPage: Boolean(page), loadState, stale, draft, applied, businesses, services, servicesLoading, servicesError, sectionRef, changeDraft, applyFilters, clearFilters, changePage, retry: () => loadReservations(), retryServices: () => loadServices(draft.businessId) }), [applied, businesses, changeDraft, changePage, clearFilters, draft, loadState, page, services, servicesError, servicesLoading, stale, applyFilters, loadReservations, loadServices]);
}
