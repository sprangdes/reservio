import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const controller = source('features/business-operations/reservations/hooks/useReservationCenter.ts');
const mobileNavigation = source('features/business-operations/ui/MobileBottomNavigation.tsx');
const reservationPage = source('features/business-operations/ReservationCenterPage.tsx');
const listStates = source('features/business-operations/reservations/ui/ReservationListStates.tsx');
const drawer = source('features/business-operations/reservations/ui/ReservationDetailsDrawer.tsx');
const mobileDetails = source('features/business-operations/reservations/ui/ReservationDetailsPage.tsx');
const confirmation = source('features/business-operations/reservations/ui/ReservationActionConfirmation.tsx');
const focusTrap = source('features/business-operations/reservations/ui/useModalFocusTrap.ts');
const flags = source('features/business-operations/future/featureFlags.ts');

test('Family 3 final integration preserves one Reservation Center with safe calendar history state', () => {
  assert.match(reservationPage, /calendarFromUrl/);
  assert.doesNotMatch(reservationPage, /legacyMode|LegacyReservationPage/);
  assert.match(reservationPage, /ReservationCalendarView/);
  assert.match(mobileNavigation, /行事曆/);
  assert.match(mobileNavigation, /view=calendar/);
  assert.match(mobileNavigation, /aria-current/);
  assert.doesNotMatch(listStates, /行事曆正在整合/);
});

test('Family 3 mutation flow refreshes an already loaded calendar without a second mutation pipeline', () => {
  assert.match(controller, /await adapter\.mutate/);
  assert.match(controller, /await refresh\(\)/);
  assert.match(controller, /await loadCalendar\('refresh'\)/);
  assert.doesNotMatch(controller, /fetch\(|\/api\//);
});

test('Family 3 modal surfaces trap focus, restore focus, and retain accessible dialogs', () => {
  assert.match(focusTrap, /event\.key !== 'Tab'/);
  assert.match(focusTrap, /openerRef\.current\?\.focus/);
  assert.match(drawer, /useModalFocusTrap/);
  assert.match(mobileDetails, /useModalFocusTrap/);
  assert.match(confirmation, /useModalFocusTrap/);
  assert.match(confirmation, /role="alertdialog"/);
  assert.match(drawer, /role="dialog"/);
});

test('future operations capabilities retain production-safe defaults and no preview transport', () => {
  assert.match(flags, /reports: previewState/);
  assert.match(flags, /resourceScheduling: 'unavailable'/);
  assert.match(flags, /import\.meta\.env\.DEV/);
  assert.doesNotMatch(flags, /fetch\(|\/api\//);
});
