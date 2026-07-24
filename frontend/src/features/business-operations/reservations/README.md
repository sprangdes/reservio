# Reservation Center data foundation

`ReservationCenterItem` only normalizes fields returned by the existing business reservation query. Customer phone, resource or staff assignment, rejection reason, notification context, and full reservation details are explicitly marked unsupported. List-derived details remain `partial` until a supported detail endpoint exists.

The adapter sends only the existing query contract: `page`, `size`, `sortBy`, `sortDir`, `startDate`, `endDate`, `service`, `keyword`, and `status`. Resource filters, advanced search, bulk actions, exports, reports, and message center state never become request parameters.

Future shareable URL state may include `preset`, date range, statuses, service, sort, page, page size, and calendar view. Keyword input is intentionally local state because it may contain customer-identifying text. Phase 2 does not synchronize these values to the URL.

Legacy route mapping is centralized in `routePresets.ts`:

| Route | Preset |
| --- | --- |
| `/reservation/today/manage` | `today` |
| `/reservation/pending/manage` | `pending` |
| `/reservation/manage` | `all` |

`calendar` exists only as typed frontend state. No calendar route or calendar API request is introduced in this phase.

## Reservation details behavior

Reservation details are rendered only from the normalized list item and remain explicitly `partial` unless the backend later provides a supported detail endpoint. Unsupported customer phone, staff or resource, rejection reason, notification context, and audited status history are omitted rather than filled with placeholders.

The desktop experience is a modal right-side drawer. Mobile uses a full-screen local detail page; it pushes only the selected reservation ID into browser history state, never into the URL. Browser Back closes the detail surface. A direct refresh has no selected list item and safely remains in Reservation Center instead of fabricating a detail record.

The timeline is a clearly marked current-state summary. Its timestamp entries are safely derived from returned `createdAt` and `updatedAt` values, not represented as an audited backend event log. Supported actions still use the existing status endpoint through the Phase 2 adapter and require an accessible confirmation dialog before mutation.

## Calendar state and data behavior

`行事曆` is a local unified Reservation Center view, not a new route. Its view mode is held in the existing typed `calendarView` query state; the selected calendar date is local controller state and is intentionally not written to the URL. This keeps existing bookmarked reservation routes unchanged and avoids placing operational context or customer search text into the address bar.

The calendar requests a date-bounded page through the same Reservation Center adapter and the existing business reservation query endpoint. Day, week, and month ranges are calculated from local calendar date parts; the week begins on Sunday to preserve the prior application behavior. Calendar events use only normalized list fields. An absent end time remains absent unless an existing normalized duration can derive it. Resource scheduling remains capability-gated and never affects requests.
