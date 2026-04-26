export async function loadBusinessActiveServices(apiClient, businessId) {
  const res = await apiClient.businessActiveServices(businessId);
  const items = res?.items || res?.data || res || [];
  return Array.isArray(items) ? items : [];
}

export async function updateBusinessReservationStatus(apiClient, id, action) {
  return apiClient.updateReservationStatus(id, { action });
}

export function getNextSortState(currentSortBy, currentSortDir, field) {
  if (currentSortBy === field) {
    return { sortBy: currentSortBy, sortDir: currentSortDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortBy: field, sortDir: 'asc' };
}
