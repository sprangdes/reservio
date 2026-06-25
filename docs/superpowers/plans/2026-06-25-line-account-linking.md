# LINE Account Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link merchant LINE customers to authenticated Reservio customer accounts, transfer prior LINE reservations, and display reservation-time customer names.

**Architecture:** Reservation snapshots are stored directly on `Reservation`. `LineCustomer` retains its synthetic user and optionally references a linked Reservio user. A short-lived `LineAccountLink` state machine coordinates LINE link tokens, authenticated confirmation, nonce validation, webhook completion, transfer, and unlinking.

**Tech Stack:** Java 17, Spring Boot 3, Spring Data JPA, Spring Security, LINE Messaging API, React 18, TypeScript, JUnit 5, Mockito, H2/PostgreSQL

---

### Task 1: Reservation customer snapshots

**Files:**
- Modify: `src/main/java/com/reservio/entity/Reservation.java`
- Modify: `src/main/java/com/reservio/service/ReservationCommandService.java`
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Modify: `src/main/java/com/reservio/controller/ReservationApiController.java`
- Modify: `src/main/java/com/reservio/service/specification/ReservationSpecification.java`
- Test: `src/test/java/com/reservio/service/ReservationCommandServiceTest.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] Add a failing command-service test proving supplied `customerName` and `customerPhone` are persisted on the new reservation.
- [ ] Run `mvn -Dtest=ReservationCommandServiceTest test` and verify the new assertion fails.
- [ ] Add nullable `customerName` and `customerPhone` fields and extend `createReservation` with snapshot arguments.
- [ ] Update WEB callers to pass `null`; update the LINE caller to pass conversation name and phone.
- [ ] Make `ReservationResponse.username` prefer nonblank `reservation.customerName`, with username fallback.
- [ ] Extend business keyword search to include `reservation.customerName`.
- [ ] Run focused reservation and conversation tests.
- [ ] Commit with `feat: store reservation customer snapshots`.

### Task 2: Linked LINE customer identity

**Files:**
- Modify: `src/main/java/com/reservio/line/entity/LineCustomer.java`
- Modify: `src/main/java/com/reservio/line/repo/LineCustomerRepo.java`
- Modify: `src/main/java/com/reservio/line/service/LineCustomerService.java`
- Test: `src/test/java/com/reservio/line/service/LineCustomerServiceTest.java`

- [ ] Add failing tests proving an existing linked customer returns `linkedUser`, while an unlinked customer returns its synthetic user.
- [ ] Run `mvn -Dtest=LineCustomerServiceTest test` and verify RED.
- [ ] Add nullable `linkedUser` and `linkedAt` fields to `LineCustomer`.
- [ ] Return `linkedUser` when present and preserve contact metadata updates.
- [ ] Add repository queries for linked customers by authenticated user.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit with `feat: support linked LINE customers`.

### Task 3: Rich account-link reply and LINE API client

**Files:**
- Modify: `src/main/java/com/reservio/line/message/LineReplyMessage.java`
- Modify: `src/main/java/com/reservio/line/message/LineMessageFactory.java`
- Modify: `src/main/java/com/reservio/line/service/LineMessagingClient.java`
- Test: `src/test/java/com/reservio/line/message/LineMessageFactoryTest.java`
- Test: `src/test/java/com/reservio/line/service/LineMessagingClientTest.java`

- [ ] Add failing tests for a URI action button message and `POST /v2/bot/user/{userId}/linkToken`.
- [ ] Run the two focused test classes and verify RED.
- [ ] Extend `LineReplyMessage` to represent text/quick reply and a single URI button without exposing raw JSON to conversation code.
- [ ] Serialize the button as a LINE buttons template in `LineMessagingClient.reply`.
- [ ] Add `issueLinkToken(channel, lineUserId)` and validate the response contains `linkToken`.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit with `feat: add LINE account link messages`.

### Task 4: Account-link persistence and secure token service

**Files:**
- Create: `src/main/java/com/reservio/line/entity/LineAccountLink.java`
- Create: `src/main/java/com/reservio/line/entity/LineAccountLinkStatus.java`
- Create: `src/main/java/com/reservio/line/repo/LineAccountLinkRepo.java`
- Create: `src/main/java/com/reservio/line/security/LineAccountLinkTokenService.java`
- Create: `src/main/java/com/reservio/line/service/LineAccountLinkService.java`
- Create: `src/main/java/com/reservio/line/controller/response/LineAccountLinkStatusResponse.java`
- Test: `src/test/java/com/reservio/line/security/LineAccountLinkTokenServiceTest.java`
- Test: `src/test/java/com/reservio/line/service/LineAccountLinkServiceTest.java`

- [ ] Add failing tests for random request tokens, SHA-256 hashes, nonce generation, ten-minute expiry, and single-use confirmation.
- [ ] Run focused tests and verify RED.
- [ ] Implement token generation/hashing and the `LineAccountLink` state model.
- [ ] Implement creation using LINE link token issuance and encrypted token storage.
- [ ] Implement authenticated status lookup and confirmation URL generation for `ROLE_USER`.
- [ ] Ensure expired, completed, business-user, and already-linked-to-another-user requests are rejected.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit with `feat: add LINE account link requests`.

### Task 5: Link completion, transfer, and unlink

**Files:**
- Modify: `src/main/java/com/reservio/repo/ReservationRepo.java`
- Modify: `src/main/java/com/reservio/line/repo/LineCustomerRepo.java`
- Modify: `src/main/java/com/reservio/line/service/LineAccountLinkService.java`
- Test: `src/test/java/com/reservio/line/service/LineAccountLinkServiceTest.java`

- [ ] Add failing tests proving completion validates business, LINE user ID, nonce, and transfers only matching `LINE` reservations.
- [ ] Add a failing redelivery test proving completed callbacks are idempotent.
- [ ] Add a failing unlink test proving only the linked authenticated user can unlink.
- [ ] Implement a modifying reservation transfer query scoped by business, synthetic user, and `ReservationSource.LINE`.
- [ ] Implement transactional completion and unlink methods.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit with `feat: complete LINE account linking`.

### Task 6: Webhook account-link event handling

**Files:**
- Modify: `src/main/java/com/reservio/line/service/LineWebhookWorker.java`
- Test: `src/test/java/com/reservio/line/service/LineWebhookWorkerTest.java`

- [ ] Add failing tests for successful and failed `accountLink` webhook events.
- [ ] Run `mvn -Dtest=LineWebhookWorkerTest test` and verify RED.
- [ ] Detect `type=accountLink`, read `source.userId`, `link.result`, and `link.nonce`, and delegate to `LineAccountLinkService`.
- [ ] Reply with success/failure text when a reply token is present.
- [ ] Exclude account-link callbacks from interactive rate limiting.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit with `feat: handle LINE account link callbacks`.

### Task 7: Authenticated account-link API

**Files:**
- Create: `src/main/java/com/reservio/line/controller/LineAccountLinkController.java`
- Create: `src/main/java/com/reservio/line/controller/response/LinkedLineBusinessResponse.java`
- Modify: `src/main/java/com/reservio/config/SecurityConfig.java`
- Test: `src/test/java/com/reservio/line/controller/LineAccountLinkControllerTest.java`

- [ ] Add failing controller tests for public request inspection, authenticated confirmation, linked-business listing, and unlink.
- [ ] Run the focused controller test and verify RED.
- [ ] Add endpoints:
  - `GET /api/line/account-links/{requestToken}`
  - `POST /api/line/account-links/{requestToken}/confirm`
  - `GET /api/line/account-links`
  - `DELETE /api/line/account-links/{lineCustomerId}`
- [ ] Permit only the public inspection endpoint without authentication; confirmation/list/unlink require a session and CSRF.
- [ ] Run controller and security tests.
- [ ] Commit with `feat: expose LINE account linking API`.

### Task 8: Attach linking prompt to completed reservations

**Files:**
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Modify: `src/main/java/com/reservio/line/service/LineCustomerService.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] Add failing tests proving unlinked customers receive a link button and linked customers receive plain success text.
- [ ] Add a failing test proving link-token failure does not roll back a completed reservation.
- [ ] Return a `LineCustomer` resolution object containing both reservation user and link status.
- [ ] Create a short-lived account-link request only after reservation creation succeeds.
- [ ] Build the public URL from `LINE_WEBHOOK_BASE_URL` origin and return the URI button message.
- [ ] Run conversation tests and verify GREEN.
- [ ] Commit with `feat: prompt LINE customers to link accounts`.

### Task 9: Frontend confirmation and unlink management

**Files:**
- Create: `frontend/src/pages/LineAccountLinkPage.tsx`
- Create: `frontend/src/pages/LineAccountLinksPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: relevant customer navigation component

- [ ] Add API types and methods for status, confirm, list, and unlink.
- [ ] Add `/line/account-link` page that preserves the request token, requires customer login, confirms, then redirects to LINE's account-link URL.
- [ ] Make password and LINE login preserve an allowlisted relative `returnTo`.
- [ ] Add an authenticated customer page listing linked merchants with unlink actions.
- [ ] Run `npm run typecheck` and `npm run build` from `frontend`.
- [ ] Commit with `feat: add LINE account linking UI`.

### Task 10: End-to-end verification and documentation

**Files:**
- Modify: `docs/line-messaging-rollout.md`
- Test: `src/test/java/com/reservio/line/LineReservationIntegrationTest.java`

- [ ] Add an integration test covering reservation creation, account-link completion, historical transfer, and a subsequent directly linked reservation.
- [ ] Run `mvn -Dtest=LineReservationIntegrationTest test`.
- [ ] Run `mvn -Dtest='*Test,!DatabaseConnectionTest' test`.
- [ ] Run `npm run typecheck && npm run build` in `frontend`.
- [ ] Run `git diff --check`.
- [ ] Document production configuration, Cloudflare allowlist requirements, and manual test steps.
- [ ] Commit with `docs: add LINE account linking rollout steps`.
