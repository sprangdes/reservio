type SortDir = 'asc' | 'desc';

interface Params<TFilterDraft extends object> {
  sortBy: string;
  sortDir: string;
  setSortBy: (value: string) => void;
  setSortDir: (value: SortDir) => void;
  setPage: (value: number | ((prev: number) => number)) => void;
  filterDraft: TFilterDraft;
  setFilters: (value: TFilterDraft) => void;
}

export function useReservationListControls<TFilterDraft extends object>({
  sortBy,
  sortDir,
  setSortBy,
  setSortDir,
  setPage,
  filterDraft,
  setFilters
}: Params<TFilterDraft>) {
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const applyFilters = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setFilters({ ...filterDraft });
    setPage(0);
  };

  return {
    handleSort,
    applyFilters
  };
}
