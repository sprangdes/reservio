const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }
  return data;
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  login: (payload) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  register: (payload) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  registerBusiness: (payload) => request('/api/auth/register-business', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  me: () => request('/api/me'),
  dashboard: () => request('/api/dashboard'),
  businesses: () => request('/api/businesses'),
  businessServices: (id) => request(`/api/businesses/${id}/services`),
  disabledDates: () => request('/api/reservations/disabled-dates'),
  slots: (date, duration) => request(`/api/reservations/slots?date=${date}&duration=${duration}`),
  createReservation: (payload) => request('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  myReservations: (params) => request(`/api/reservations/my${buildQuery(params)}`),
  cancelReservation: (id, payload) => request(`/api/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  businessReservations: (params) => request(`/api/reservations${buildQuery(params)}`),
  pendingReservations: (params) => request(`/api/reservations/pending${buildQuery(params)}`),
  todayReservations: (params) => request(`/api/reservations/today${buildQuery(params)}`),
  updateReservationStatus: (id, payload) => request(`/api/reservations/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  businessActiveServices: (id) => request(`/api/businesses/${id}/services/active`),
  addServiceItem: (payload) => request('/api/businesses/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  deleteServiceItem: (id) => request(`/api/businesses/services/${id}/delete`, {
    method: 'POST'
  }),
  modifyServiceItem: (id, payload) => request(`/api/businesses/services/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  serviceOn: (id) => request(`/api/businesses/services/${id}/on`, { method: 'POST' }),
  serviceOff: (id) => request(`/api/businesses/services/${id}/off`, { method: 'POST' })
};
