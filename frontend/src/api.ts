const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

type Primitive = string | number | boolean;
export type QueryParams = Record<string, Primitive | null | undefined>;
async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = (await response.json().catch((): null => null)) as { message?: string } | null;
  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }
  return data as T;
}

function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  login: (payload: unknown) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  register: (payload: unknown) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  registerBusiness: (payload: unknown) => request('/api/auth/register-business', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  requestPasswordResetOtp: (payload: unknown) => request('/api/auth/forgot-password/request-otp', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  verifyPasswordResetOtp: (payload: unknown) => request('/api/auth/forgot-password/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  forceChangePassword: (payload: unknown) => request('/api/auth/force-change-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  me: () => request('/api/me'),
  dashboard: () => request('/api/dashboard'),
  businesses: () => request('/api/businesses'),
  businessServices: (id: string | number) => request(`/api/businesses/${id}/services`),
  disabledDates: (businessId: string | number) => request(`/api/reservations/disabled-dates?businessId=${businessId}`),
  slots: (date: string, duration: string | number, businessId: string | number) =>
    request(`/api/reservations/slots?date=${date}&duration=${duration}&businessId=${businessId}`),
  createReservation: (payload: unknown) => request('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  cancelReservation: (id: string | number, payload?: unknown) => request(`/api/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  customerReservations: (params?: QueryParams, condition?: unknown) => request(`/api/reservations/customer/query${buildQuery(params)}`, {
    method: 'POST',
    body: JSON.stringify(condition || {})
  }),
  customerReservedBusinesses: () => request('/api/reservations/customer/reserved-businesses'),
  businessReservations: (params?: QueryParams, condition?: unknown) => request(`/api/reservations/business/query${buildQuery(params)}`, {
    method: 'POST',
    body: JSON.stringify(condition || {})
  }),
  todayReservations: () => request('/api/reservations/today'),
  weekReservations: () => request('/api/reservations/week'),
  monthReservations: () => request('/api/reservations/month'),
  updateReservationStatus: (id: string | number, payload: unknown) => request(`/api/reservations/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  businessActiveServices: (id: string | number) => request(`/api/businesses/${id}/services/active`),
  businessCategories: () => request('/api/businesses/category'),
  getDefaultSlots: () => request('/api/businesses/slot/default'),
  setDefaultSlots: (payload?: unknown) => request('/api/businesses/slot/default', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  getDateSlot: (payload?: unknown) => request('/api/businesses/slot/date', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  getAdjustedSlots: () => request('/api/businesses/slot/adjusted'),
  adjustDateSlot: (payload?: unknown) => request('/api/businesses/slot/date/adjust', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  deleteDateSlot: (payload?: unknown) => request('/api/businesses/slot/date/delete', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  updateBusinessInfo: (payload?: unknown) => request('/api/businesses/info/update', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  addServiceItem: (payload: unknown) => request('/api/businesses/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  deleteServiceItem: (id: string | number) => request(`/api/businesses/services/${id}/delete`, {
    method: 'POST'
  }),
  modifyServiceItem: (id: string | number, payload: unknown) => request(`/api/businesses/services/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  serviceOn: (id: string | number) => request(`/api/businesses/services/${id}/on`, { method: 'POST' }),
  serviceOff: (id: string | number) => request(`/api/businesses/services/${id}/off`, { method: 'POST' })
};
