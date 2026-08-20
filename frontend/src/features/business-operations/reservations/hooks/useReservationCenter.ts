import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isReservationActionAvailable, resolveReservationActionCapabilities } from '../capabilities';
import { initialReservationMutationState, reservationMutationError, reservationMutationPending, reservationMutationStale, reservationMutationSuccess } from '../mutationState';
import { appendReservationPage, createMobileReservationPageState, getReservationPaginationState, setMobileLoadMoreError, setMobileLoadingMore } from '../pagination';
import { defaultReservationQuery, localDate, normalizeReservationQuery, reservationQueryKey, updateReservationQuery } from '../query';
import { createReservationCalendarQuery } from '../calendar';
import { reconcileReservationSelection, selectReservation } from '../selection';
import { reservationCenterAdapter } from '../data/reservationCenterAdapter';
import type { ReservationAction, ReservationCalendarState, ReservationCenterAdapter, ReservationCenterItem, ReservationDetailsSelection, ReservationLoadState, ReservationMutationState, ReservationPageResult, ReservationQuery, ReservationViewPreset } from '../types';

const initialLoadState: ReservationLoadState = { phase: 'idle', error: null, hasStaleData: false };

export function useReservationCenter({ preset = 'all', adapter = reservationCenterAdapter, now }: Readonly<{ preset?: ReservationViewPreset; adapter?: ReservationCenterAdapter; now?: Date }>) {
  const [query, setQuery] = useState(() => defaultReservationQuery(preset, now));
  const [result, setResult] = useState<ReservationPageResult | null>(null);
  const [loadState, setLoadState] = useState<ReservationLoadState>(initialLoadState);
  const [mobilePages, setMobilePages] = useState(() => createMobileReservationPageState(reservationQueryKey(defaultReservationQuery(preset, now))));
  const [selection, setSelection] = useState<ReservationDetailsSelection | null>(null);
  const [mutationState, setMutationState] = useState<ReservationMutationState>(initialReservationMutationState);
  const [calendar, setCalendar] = useState<ReservationCalendarState>(() => ({ selectedDate: localDate(now), mode: defaultReservationQuery('calendar', now).calendarView, result: null, loadState: initialLoadState, requestKey: '' }));
  const queryRef = useRef(query);
  const resultRef = useRef<ReservationPageResult | null>(result);
  const calendarRef = useRef(calendar);
  const calendarRequestRef = useRef(0);
  queryRef.current = query;
  resultRef.current = result;
  calendarRef.current = calendar;
  const queryKey = useMemo(() => reservationQueryKey(query), [query]);

  useEffect(() => {
    if (queryRef.current.preset !== preset) {
      const next = defaultReservationQuery(preset, now);
      setQuery(next);
      setMobilePages(createMobileReservationPageState(reservationQueryKey(next)));
      setSelection(null);
    }
  }, [now, preset]);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'retry' = 'initial') => {
    const current = normalizeReservationQuery(queryRef.current, now);
    setLoadState({ phase: mode === 'refresh' && resultRef.current ? 'refreshing' : 'initial-loading', error: null, hasStaleData: Boolean(resultRef.current) });
    try {
      const next = await adapter.query(current);
      setResult(next);
      setSelection((currentSelection) => reconcileReservationSelection(currentSelection, next.items));
      const isFiltered = Boolean(current.filter.dateFrom || current.filter.dateTo || current.filter.service || current.filter.keyword || current.filter.statuses.length);
      setLoadState({ phase: next.items.length ? 'ready' : isFiltered ? 'filter-empty' : 'empty', error: null, hasStaleData: false });
      if (mode !== 'refresh') setMobilePages(appendReservationPage(createMobileReservationPageState(reservationQueryKey(current)), next, reservationQueryKey(current)));
      return next;
    } catch (error) {
      const resolved = error instanceof Error ? error : new Error('載入預約失敗');
      setLoadState({ phase: 'query-error', error: resolved, hasStaleData: Boolean(resultRef.current) });
      throw resolved;
    }
  }, [adapter, now]);

  useEffect(() => { void load().catch(() => undefined); }, [load, queryKey]);

  const applyQuery = useCallback((patch: Partial<ReservationQuery>) => {
    setQuery((current) => updateReservationQuery(current, patch, now));
    setMobilePages(createMobileReservationPageState(reservationQueryKey(updateReservationQuery(queryRef.current, patch, now))));
  }, [now]);

  const setCalendarDate = useCallback((selectedDate: string) => setCalendar((current) => ({ ...current, selectedDate })), []);
  const setCalendarMode = useCallback((mode: ReservationCalendarState['mode']) => {
    setCalendar((current) => ({ ...current, mode }));
    applyQuery({ calendarView: mode });
  }, [applyQuery]);
  const loadCalendar = useCallback(async (mode: 'initial' | 'refresh' | 'retry' = 'initial') => {
    const requestId = calendarRequestRef.current + 1;
    calendarRequestRef.current = requestId;
    const currentCalendar = calendarRef.current;
    const request = createReservationCalendarQuery(queryRef.current, currentCalendar.selectedDate, currentCalendar.mode);
    const requestKey = reservationQueryKey(request);
    setCalendar((current) => ({ ...current, requestKey, loadState: { phase: mode === 'refresh' && current.result ? 'refreshing' : 'initial-loading', error: null, hasStaleData: Boolean(current.result) } }));
    try {
      const next = await adapter.query(request);
      if (calendarRequestRef.current !== requestId) return next;
      setCalendar((current) => ({ ...current, result: next, requestKey, loadState: { phase: next.items.length ? 'ready' : Boolean(request.filter.service || request.filter.keyword || request.filter.statuses.length) ? 'filter-empty' : 'empty', error: null, hasStaleData: false } }));
      setSelection((currentSelection) => reconcileReservationSelection(currentSelection, next.items));
      return next;
    } catch (error) {
      const resolved = error instanceof Error ? error : new Error('載入行事曆失敗');
      if (calendarRequestRef.current === requestId) setCalendar((current) => ({ ...current, requestKey, loadState: { phase: 'query-error', error: resolved, hasStaleData: Boolean(current.result) } }));
      throw resolved;
    }
  }, [adapter]);

  const refresh = useCallback(() => load('refresh'), [load]);
  const retry = useCallback(() => load('retry'), [load]);
  const loadMore = useCallback(async () => {
    if (mobilePages.isLoadingMore || !mobilePages.hasMore) return;
    const nextQuery = normalizeReservationQuery({ ...queryRef.current, page: mobilePages.nextPage }, now);
    setMobilePages((current) => setMobileLoadingMore(current, true));
    try {
      const next = await adapter.query(nextQuery);
      setMobilePages((current) => appendReservationPage(current, next, reservationQueryKey(nextQuery)));
    } catch (error) {
      setMobilePages((current) => setMobileLoadMoreError(current, error instanceof Error ? error : new Error('載入更多預約失敗')));
    }
  }, [adapter, mobilePages.hasMore, mobilePages.isLoadingMore, mobilePages.nextPage, now]);

  const select = useCallback((item: ReservationCenterItem | undefined) => setSelection(selectReservation(item)), []);
  const clearSelection = useCallback(() => setSelection(null), []);
  const mutate = useCallback(async (item: ReservationCenterItem, action: Exclude<ReservationAction, 'viewDetails' | 'inspectCancellationReason' | 'retryMutation'>) => {
    const capabilities = resolveReservationActionCapabilities(item);
    if (!isReservationActionAvailable(capabilities, action)) throw new Error(capabilities[action].reason || '目前不支援此預約操作');
    setMutationState(reservationMutationPending(item.id, action));
    try {
      await adapter.mutate(item.id, action);
      setMutationState(reservationMutationSuccess(item.id, action));
      await refresh();
      if (calendarRef.current.result) await loadCalendar('refresh');
      setMutationState((current) => reservationMutationStale(current));
    } catch (error) {
      const resolved = error instanceof Error ? error : new Error('更新預約失敗');
      setMutationState(reservationMutationError(item.id, action, resolved));
      throw resolved;
    }
  }, [adapter, loadCalendar, refresh]);

  return { query, result, items: result?.items || [], pagination: result ? getReservationPaginationState(result) : null, loadState, mobilePages, selection, mutationState, calendar, setCalendarDate, setCalendarMode, loadCalendar, setQuery: applyQuery, refresh, retry, loadMore, select, clearSelection, mutate };
}
