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
  myReservations: () => request('/api/reservations/my'),
  cancelReservation: (id, payload) => request(`/api/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  }),
  businessReservations: () => request('/api/reservations'),
  pendingReservations: () => request('/api/reservations/pending'),
  todayReservations: () => request('/api/reservations/today'),
  updateReservationStatus: (id, payload) => request(`/api/reservations/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  addServiceItem: (payload) => request('/api/businesses/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
