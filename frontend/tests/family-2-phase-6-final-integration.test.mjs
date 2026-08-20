import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

test('Family 2 retains exactly the two customer routes and structural guard ordering', () => {
  const app = source('App.tsx');
  assert.match(app, /path="\/reservation\/new"[\s\S]*?<RequireAuth>[\s\S]*?<RequireCustomer><ReservationNewPage/);
  assert.match(app, /path="\/my\/reservations"[\s\S]*?<RequireAuth>[\s\S]*?<RequireCustomer><MyReservationsPage/);
  assert.match(app, /function RequireCustomer[\s\S]*?me\.role !== 'ROLE_USER'[\s\S]*?resolvePostAuthDestination\(me\)\.path/);
  assert.match(app, /<PasswordResetGuard>[\s\S]*?<BusinessSetupGuard>/);
  assert.match(app, /path="\/reservation\/manage"/);
  assert.match(app, /path="\/reservation\/today\/manage"/);
  assert.match(app, /path="\/reservation\/pending\/manage"/);
});

test('booking retry, typed-date and submit-error focus paths preserve the final accessibility contract', () => {
  const flow = source('features/customer-booking/BookingFlowPage.tsx');
  const datePicker = source('features/customer-booking/BookingDatePicker.tsx');
  const review = source('features/customer-booking/BookingReview.tsx');
  assert.match(flow, /businessRetryRef\.current/);
  assert.match(flow, /serviceRetryRef\.current/);
  assert.match(flow, /serviceHeadingRef\.current\?\.focus\(\)/);
  assert.match(flow, /document\.activeElement\?\.id !== 'booking-remark'/);
  assert.match(flow, /submitErrorRef\.current\?\.focus\(\)/);
  assert.match(datePicker, /請選擇有效且可預約的日期。/);
  assert.match(datePicker, /aria-invalid=\{Boolean\(inputError\)\}/);
  assert.match(datePicker, /onChange\(null\)/);
  assert.match(review, /ref=\{submitErrorRef\}/);
});

test('reservation empty rendering distinguishes an authoritative account-empty response from a filtered empty response', () => {
  const workspace = source('features/customer-reservations/MyReservationsWorkspace.tsx');
  const states = source('features/customer-reservations/ReservationWorkspaceStates.tsx');
  assert.match(workspace, /filtered \? <ReservationFilteredEmptyState onClear=\{workspace\.clearFilters\} \/> : <ReservationEmptyState \/>/);
  assert.match(states, /目前沒有符合篩選條件的預約。/);
  assert.match(states, /清除篩選/);
  assert.match(states, /目前還沒有預約。/);
});

test('final Family 2 remains privacy-safe and excludes legacy customer cancellation surfaces', () => {
  const booking = source('features/customer-booking/BookingFlowPage.tsx');
  const result = source('features/customer-booking/BookingResultState.tsx');
  const workspace = source('features/customer-reservations/MyReservationsWorkspace.tsx');
  const cancellation = source('features/customer-reservations/CancelReservationOverlay.tsx');
  const combined = `${booking}\n${result}\n${workspace}\n${cancellation}`;
  assert.doesNotMatch(combined, /window\.(alert|confirm)|localStorage|sessionStorage|console\.(log|debug|warn|error)/);
  assert.doesNotMatch(result, /\.id|userId|businessId|username/);
  assert.doesNotMatch(workspace, /<table|reservation\/[^n]/);
  assert.equal((cancellation.match(/api\.cancelReservation/g) || []).length, 1);
});
