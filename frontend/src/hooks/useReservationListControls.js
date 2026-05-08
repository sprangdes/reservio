export function useReservationListControls({
  sortBy,
  sortDir,
  setSortBy,
  setSortDir,
  setPage,
  filterDraft,
  setFilters
}) {
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({ ...filterDraft });
    setPage(0);
  };

  return {
    handleSort,
    applyFilters
  };
}
