import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../src/features/business-operations/ReservationCenterPage.tsx', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('../src/features/business-operations/reservations/ui/ReservationDesktopList.tsx', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../src/features/business-operations/reservations/ui/ReservationMobileList.tsx', import.meta.url), 'utf8');
const actions = readFileSync(new URL('../src/features/business-operations/reservations/ui/ReservationActionMenu.tsx', import.meta.url), 'utf8');
const status = readFileSync(new URL('../src/features/business-operations/reservations/ui/ReservationStatusBadge.tsx', import.meta.url), 'utf8');

test('unified reservation page consumes the Phase 2 controller and exposes all list states', () => {
  assert.match(page, /useReservationCenter\(\{ preset \}\)/);
  assert.match(page, /ReservationDesktopList/);
  assert.match(page, /ReservationMobileList/);
  assert.match(page, /ReservationListSkeleton/);
  assert.match(page, /ReservationEmptyState/);
  assert.match(page, /ReservationErrorState/);
  assert.match(page, /ReservationMobileLoadMore/);
  assert.match(page, /ReservationCalendarBoundary/);
  assert.doesNotMatch(page, /businessReservations\(/);
});

test('desktop list is semantic, selectable, sortable, and action-capability driven', () => {
  assert.match(desktop, /<table>/);
  assert.match(desktop, /<thead>/);
  assert.match(desktop, /scope="col"/);
  assert.match(desktop, /scope="row"/);
  assert.match(desktop, /aria-selected/);
  assert.match(desktop, /onKeyDown/);
  assert.match(desktop, /ReservationStatusBadge/);
  assert.match(desktop, /ReservationActionMenu/);
});

test('mobile list uses dedicated cards and action menu uses centralized capability resolution', () => {
  assert.match(mobile, /reservation-mobile-card/);
  assert.match(mobile, /<article/);
  assert.match(mobile, /ReservationStatusBadge/);
  assert.match(actions, /resolveReservationActionCapabilities/);
  assert.match(actions, /mutationActions/);
  assert.doesNotMatch(actions, /updateReservationStatus/);
  assert.match(status, /getReservationStatusPresentation/);
  assert.doesNotMatch(status, /=== 'PENDING'/);
});
