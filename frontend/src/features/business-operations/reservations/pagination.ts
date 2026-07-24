import type { MobileReservationPageState, ReservationCenterItem, ReservationPageResult, ReservationPaginationState } from './types';

export function getReservationPaginationState(result: ReservationPageResult): ReservationPaginationState {
  return { page: result.page, totalPages: result.totalPages, totalCount: result.totalCount, pageSize: result.pageSize, hasPreviousPage: result.page > 0, hasNextPage: result.hasNextPage };
}

export function createMobileReservationPageState(queryKey: string): MobileReservationPageState { return { items: [], nextPage: 0, hasMore: true, isLoadingMore: false, error: null, queryKey }; }

export function appendReservationPage(current: MobileReservationPageState, result: ReservationPageResult, queryKey: string): MobileReservationPageState {
  const prior = current.queryKey === queryKey ? current.items : [];
  const ids = new Set(prior.map((item) => String(item.id)));
  const items = [...prior, ...result.items.filter((item: ReservationCenterItem) => !ids.has(String(item.id)))];
  return { items, nextPage: result.page + 1, hasMore: result.hasNextPage, isLoadingMore: false, error: null, queryKey };
}

export function setMobileLoadMoreError(current: MobileReservationPageState, error: Error): MobileReservationPageState { return { ...current, isLoadingMore: false, error }; }
export function setMobileLoadingMore(current: MobileReservationPageState, loading: boolean): MobileReservationPageState { return { ...current, isLoadingMore: loading, error: loading ? null : current.error }; }
