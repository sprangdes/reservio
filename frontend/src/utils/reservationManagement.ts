type ApiClient = {
  businessActiveServices: (businessId: string | number) => Promise<any>;
  updateReservationStatus: (id: string | number, payload: { action: string }) => Promise<any>;
};

export async function loadBusinessActiveServices(apiClient: ApiClient, businessId: string | number) {
  const res = await apiClient.businessActiveServices(businessId);
  const items = res?.items || res?.data || res || [];
  return Array.isArray(items) ? items : [];
}

export async function updateBusinessReservationStatus(apiClient: ApiClient, id: string | number, action: string) {
  return apiClient.updateReservationStatus(id, { action });
}

export function getNextSortState(currentSortBy: string, currentSortDir: 'asc' | 'desc', field: string) {
  if (currentSortBy === field) {
    return { sortBy: currentSortBy, sortDir: currentSortDir === 'asc' ? 'desc' : 'asc' as const };
  }
  return { sortBy: field, sortDir: 'asc' as const };
}
