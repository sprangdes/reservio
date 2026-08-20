# Family 3 Phase 1 route map

| Route | Phase 1 presentation |
| --- | --- |
| `/` for a business user | New `BusinessWorkspaceShell` with the operational `OperationsOverviewPage`. Visitors and customers retain the existing `Layout` and `HomePage`. |
| `/reservation/manage` | New shell with `ReservationCenterPage` preset `all`. |
| `/reservation/today/manage` | New shell with `ReservationCenterPage` preset `today`. |
| `/reservation/pending/manage` | New shell with `ReservationCenterPage` preset `pending`. |
| `/service/manage`, `/business/setup`, `/business/info`, `/business/line-integration`, `/notifications`, `/notifications/settings`, `/profile` | Existing shell temporarily; no behavior or API contract changed. |

The reservation center never creates reservation data or calls a new API. It uses the unified list, calendar, details, and data composition under the canonical routes.

## Phase 6 overview data boundaries

- Pending work uses the existing normalized Reservation Center adapter with the existing pending-status query.
- Today agenda and next reservation reuse the `today` Reservation Center controller result; dashboard counts use only adapter totals, not the loaded page length.
- Notification summary uses the existing notification unread-count and first-page endpoints once per overview refresh, then listens for the existing notification-change event. It creates no polling loop.
- Calendar navigation uses `/reservation/today/manage?view=calendar`; the existing today route remains canonical and the query only selects the already implemented local calendar view.
- Reports and message-center previews remain capability-gated. No preview item enters a real reservation collection or invokes a new endpoint.
