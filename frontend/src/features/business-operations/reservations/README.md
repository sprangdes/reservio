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
