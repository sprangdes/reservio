# Family 3 Phase 1 route map

| Route | Phase 1 presentation |
| --- | --- |
| `/` for a business user | New `BusinessWorkspaceShell` with `OperationsOverviewPage` scaffold. Visitors and customers retain the existing `Layout` and `HomePage`. |
| `/reservation/manage` | New shell with `ReservationCenterPage` preset `all`. The existing management page remains reachable with `?legacy=1`. |
| `/reservation/today/manage` | New shell with `ReservationCenterPage` preset `today`. The existing management page remains reachable with `?legacy=1`. |
| `/reservation/pending/manage` | New shell with `ReservationCenterPage` preset `pending`. The existing management page remains reachable with `?legacy=1`. |
| `/service/manage`, `/business/setup`, `/business/info`, `/business/line-integration`, `/notifications`, `/notifications/settings`, `/profile` | Existing shell temporarily; no behavior or API contract changed. |

The Phase 1 reservation center never creates reservation data or calls a new API. It preserves the existing functional management pages as explicit compatibility views while the unified list, calendar, details, and data composition are deferred to later approved phases.
