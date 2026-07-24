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
