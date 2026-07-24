import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../src/features/business-operations/reservations/', import.meta.url);
function source(relativePath) { return readFileSync(new URL(relativePath, root), 'utf8'); }
function loadModule(relativePath, dependencies = {}) {
  const code = ts.transpileModule(source(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = (id) => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected runtime dependency: ${id}`);
  };
  Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}

const query = loadModule('query.ts');
const status = loadModule('status.ts');
const mappers = loadModule('data/reservationMappers.ts', { '../status': status });
const calendar = loadModule('calendar.ts', { './query': query });
const calendarView = source('ui/ReservationCalendarView.tsx');
const controls = source('ui/ReservationCalendarControls.tsx');
const dayView = source('ui/ReservationDayView.tsx');
const weekView = source('ui/ReservationWeekView.tsx');
const monthView = source('ui/ReservationMonthView.tsx');
const agenda = source('ui/ReservationAgenda.tsx');
const controller = source('hooks/useReservationCenter.ts');

test('calendar date ranges use local calendar semantics with a Sunday-first week', () => {
  assert.deepEqual(calendar.getCalendarRange('2026-07-24', 'day'), { startDate: '2026-07-24', endDate: '2026-07-24' });
  assert.deepEqual(calendar.calendarWeekRange('2026-07-24'), { startDate: '2026-07-19', endDate: '2026-07-25' });
  assert.deepEqual(calendar.calendarMonthRange('2026-02-17'), { startDate: '2026-02-01', endDate: '2026-02-28' });
  assert.equal(calendar.navigateCalendarDate('2026-01-31', 'month', 1), '2026-02-01');
  assert.equal(calendar.addCalendarDays('2026-02-28', 1), '2026-03-01');
});

test('calendar query preserves supported filters while applying only visible range and existing backend parameters', () => {
  const base = query.defaultReservationQuery('all', new Date('2026-07-24T09:00:00'));
  const request = calendar.createReservationCalendarQuery({ ...base, filter: { ...base.filter, service: '剪髮', statuses: ['CONFIRMED'], resourceId: 'future' } }, '2026-07-24', 'week');
  assert.equal(request.pageSize, 50);
  assert.deepEqual({ start: request.filter.dateFrom, end: request.filter.dateTo, service: request.filter.service, statuses: request.filter.statuses }, { start: '2026-07-19', end: '2026-07-25', service: '剪髮', statuses: ['CONFIRMED'] });
  assert.deepEqual(query.toBackendReservationQuery(request).condition, { startDate: '2026-07-19', endDate: '2026-07-25', service: '剪髮', keyword: null, status: 'CONFIRMED' });
});

test('calendar event mapping derives only supported end time and lays out unexpected overlaps defensively', () => {
  const first = mappers.mapReservationItem({ id: 1, status: 'CONFIRMED', reservationDate: '2026-07-24', startTime: '10:00:00', endTime: '11:00:00' });
  const second = mappers.mapReservationItem({ id: 2, status: 'PENDING', reservationDate: '2026-07-24', startTime: '10:30:00', endTime: '11:30:00' });
  const missingEnd = mappers.mapReservationItem({ id: 3, status: 'PENDING', reservationDate: '2026-07-24', startTime: '12:00:00' });
  const events = calendar.mapReservationCalendarEvents([first, second, missingEnd]);
  assert.equal(events[0].startMinutes, 600);
  assert.equal(events[2].endMinutes, undefined);
  assert.equal(events[2].hasExplicitEnd, false);
  const layout = calendar.layoutCalendarEvents(events);
  assert.equal(layout[0].column, 0);
  assert.equal(layout[1].column, 1);
});

test('calendar presentation provides desktop views, mobile agenda, selection, and no invented API calls', () => {
  assert.match(calendarView, /ReservationDayView/);
  assert.match(calendarView, /ReservationWeekView/);
  assert.match(calendarView, /ReservationMonthView/);
  assert.match(calendarView, /ReservationAgenda/);
  assert.match(calendarView, /onSelect\(event\.item\)/);
  assert.doesNotMatch(calendarView, /todayReservations|weekReservations|monthReservations|fetch\(/);
  assert.match(controls, /上一個日期範圍/);
  assert.match(controls, /今天/);
  assert.match(dayView, /reservation-calendar__now-line/);
  assert.match(weekView, /calendarWeekRange/);
  assert.match(monthView, /onSelectDate/);
  assert.match(agenda, /reservation-calendar__agenda/);
  assert.match(controller, /createReservationCalendarQuery/);
  assert.match(controller, /calendarRequestRef/);
});
