import { UnauthorizedError, emitSessionActivity, emitSessionExpired } from './sessionEvents';
import type { LineApiResponse, LineCredentialUpdateRequest } from './features/line/lineDomain';

export const API_BASE = '';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message = 'Request failed') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Primitive = string | number | boolean;
export type QueryParams = Record<string, Primitive | null | undefined>;

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
}

function shouldAttachCsrfToken(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

async function ensureCsrfToken(): Promise<string | null> {
  const existingToken = getCookie('XSRF-TOKEN');
  if (existingToken) {
    return existingToken;
  }

  const response = await fetch(`${API_BASE}/api/csrf`, {
    credentials: 'include',
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  });
  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch((): null => null) as { token?: string } | null;
  return getCookie('XSRF-TOKEN') || data?.token || null;
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers as Record<string, string>
  };

  if (shouldAttachCsrfToken(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options
  });

  if (response.status === 204) {
    emitSessionActivity();
    return null;
  }

  const data = (await response.json().catch((): null => null)) as { message?: string } | null;
  if (response.status === 401 && !path.startsWith('/api/auth/login')) {
    emitSessionExpired();
    throw new UnauthorizedError(data?.message || undefined);
  }

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new ApiError(response.status, message);
  }
  emitSessionActivity();
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
  setupBusiness: (payload: unknown) => request('/api/businesses/setup', {
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
  session: () => request('/api/session'),
  me: () => request('/api/me'),
  updateProfile: (payload: { username: string; email: string }) => request('/api/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  notifications: (page = 0, size = 20) => request(`/api/notifications?page=${page}&size=${size}`),
  notificationUnreadCount: () => request('/api/notifications/unread-count'),
  markNotificationRead: (id: string | number) => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' }),
  notificationPreferences: () => request('/api/notifications/preferences'),
  lineIntegrationSettings: () => request<LineApiResponse<unknown>>('/api/integrations/line/settings'),
  saveLineIntegrationSettings: (payload: LineCredentialUpdateRequest) => request<LineApiResponse<unknown>>('/api/integrations/line/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  disableLineIntegration: () => request<LineApiResponse<unknown>>('/api/integrations/line/settings/disable', { method: 'POST' }),
  rotateLineWebhookKey: () => request<LineApiResponse<unknown>>('/api/integrations/line/settings/rotate-webhook-key', { method: 'POST' }),
  lineIntegrationStatus: () => request<LineApiResponse<unknown>>('/api/integrations/line/status'),
  testLineIntegrationConnection: () => request<LineApiResponse<unknown>>('/api/integrations/line/test-connection', { method: 'POST' }),
  provisionLineRichMenu: () => request<LineApiResponse<unknown>>('/api/integrations/line/rich-menu', { method: 'POST' }),
  lineAccountLinkStatus: (requestToken: string) =>
    request<LineApiResponse<unknown>>(`/api/line/account-links/${encodeURIComponent(requestToken)}`),
  confirmLineAccountLink: (requestToken: string) =>
    request<LineApiResponse<unknown>>(`/api/line/account-links/${encodeURIComponent(requestToken)}/confirm`, {
      method: 'POST'
    }),
  linkedLineBusinesses: () => request<LineApiResponse<unknown>>('/api/line/account-links'),
  unlinkLineBusiness: (lineCustomerId: string | number) =>
    request(`/api/line/account-links/${lineCustomerId}`, { method: 'DELETE' }),
  updateNotificationPreferences: (payload: unknown) => request('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  requestEmailVerification: (payload: unknown) => request('/api/email-verification/request', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  verifyEmail: (payload: unknown) => request('/api/email-verification/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  dashboard: () => request('/api/dashboard'),
  businesses: () => request('/api/businesses'),
  businessesByCategory: (category: string) => request(`/api/businesses/${encodeURIComponent(category)}`),
  getPreferredBusinesses: (options: RequestInit = {}) => request('/api/preferred-businesses', options),
  setPreferredBusinesses: (payload: unknown) => request('/api/preferred-businesses', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  businessServices: (id: string | number, options: RequestInit = {}) => request(`/api/businesses/${id}/services`, options),
  disabledDates: (businessId: string | number, options: RequestInit = {}) => request(`/api/reservations/disabled-dates?businessId=${businessId}`, options),
  slots: (date: string, duration: string | number, businessId: string | number, options: RequestInit = {}) =>
    request(`/api/reservations/slots?date=${date}&duration=${duration}&businessId=${businessId}`, options),
  createReservation: (payload: unknown, options: RequestInit = {}) => request('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...options
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
