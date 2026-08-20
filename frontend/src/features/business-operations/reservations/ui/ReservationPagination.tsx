import type { MobileReservationPageState, ReservationPaginationState } from '../types';

export function ReservationDesktopPagination({ pagination, onPage, onPageSize }: Readonly<{ pagination: ReservationPaginationState; onPage: (page: number) => void; onPageSize: (size: number) => void }>) {
  return <footer className="reservation-center-ui__pagination"><span>共 {pagination.totalCount} 筆結果</span><label>每頁<select value={pagination.pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select>筆</label><div><button type="button" onClick={() => onPage(pagination.page - 1)} disabled={!pagination.hasPreviousPage} aria-label="上一頁">上一頁</button><span aria-current="page">第 {pagination.page + 1} / {Math.max(pagination.totalPages, 1)} 頁</span><button type="button" onClick={() => onPage(pagination.page + 1)} disabled={!pagination.hasNextPage} aria-label="下一頁">下一頁</button></div></footer>;
}

export function ReservationMobileLoadMore({ state, onLoadMore }: Readonly<{ state: MobileReservationPageState; onLoadMore: () => void }>) {
  if (state.error) return <div className="reservation-center-ui__load-more" role="alert"><span>無法載入更多預約：{state.error.message}</span><button type="button" onClick={onLoadMore}>重試</button></div>;
  if (!state.hasMore) return <p className="reservation-center-ui__end-of-results">已顯示所有預約</p>;
  return <div className="reservation-center-ui__load-more"><button type="button" disabled={state.isLoadingMore} onClick={onLoadMore}>{state.isLoadingMore ? '載入中' : '載入更多'}</button></div>;
}
