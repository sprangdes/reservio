# MAC-7 LINE Reservation Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LINE reservation cards immediately identifiable and make pending/confirmed cancellation behavior match the Web customer cancellation workflow.

**Architecture:** Keep cancellation state transitions in `ReservationService` and let both Web and LINE callers perform channel-specific ownership lookup before invoking the shared method. Persist a pending cancellation reservation ID in `LineConversation` so a confirmed reservation can collect one free-text reason across messages, while `LineReservationConversation` remains responsible only for LINE display and orchestration.

**Tech Stack:** Java 17, Spring Boot 3.2.5, Spring Data JPA, JUnit 5, Mockito, AssertJ, Maven

---

### Task 1: Centralize customer cancellation state transitions

**Files:**
- Modify: `src/test/java/com/reservio/service/ReservationServiceTest.java`
- Modify: `src/main/java/com/reservio/service/ReservationService.java:186-229`

- [ ] **Step 1: Add failing shared cancellation tests**

Add imports for `ReservationStatus`, `LocalDateTime`, `assertThatThrownBy`, and `never`, then add these tests and a helper to `ReservationServiceTest`:

```java
@Test
void pendingCustomerCancellationCompletesImmediatelyForAnyChannel() {
    Reservation reservation = cancellableReservation(ReservationStatus.PENDING);
    ReservationService service = service();

    service.customerCancel(reservation, null, "LINE");

    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    assertThat(reservation.getCancelReason()).isNull();
    assertThat(reservation.getCancelledAt()).isNotNull();
    assertThat(reservation.getUpdatedAt()).isNotNull();
    assertThat(reservation.getUpdatedBy()).isEqualTo("LINE");
    verify(reservationRepo).save(reservation);
    verify(reservationNotificationService).notifyBusinessOfCustomerChange(reservation);
}

@Test
void confirmedCustomerCancellationCreatesRequestWithTrimmedReason() {
    Reservation reservation = cancellableReservation(ReservationStatus.CONFIRMED);
    ReservationService service = service();

    service.customerCancel(reservation, "  臨時有事  ", "LINE");

    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCEL_REQUESTED);
    assertThat(reservation.getCancelReason()).isEqualTo("臨時有事");
    assertThat(reservation.getCancelledAt()).isNull();
    assertThat(reservation.getUpdatedBy()).isEqualTo("LINE");
    verify(reservationRepo).save(reservation);
    verify(reservationNotificationService).notifyBusinessOfCustomerChange(reservation);
}

@Test
void confirmedCustomerCancellationRejectsBlankReason() {
    Reservation reservation = cancellableReservation(ReservationStatus.CONFIRMED);
    ReservationService service = service();

    assertThatThrownBy(() -> service.customerCancel(reservation, "  ", "LINE"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("已確認預約必須提供取消原因");

    assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
    verify(reservationRepo, never()).save(reservation);
    verify(reservationNotificationService, never()).notifyBusinessOfCustomerChange(reservation);
}

private Reservation cancellableReservation(ReservationStatus status) {
    return Reservation.builder()
            .id(9L)
            .status(status)
            .reservationDate(LocalDate.now().plusYears(1))
            .startTime(LocalTime.of(10, 0))
            .endTime(LocalTime.of(11, 0))
            .build();
}

private ReservationService service() {
    return new ReservationService(
            reservationRepo,
            userDataService,
            reservationNotificationService,
            serviceItemRepo,
            reservationCommandService
    );
}
```

Update the existing website reservation test to call `service()` instead of constructing `ReservationService` inline.

- [ ] **Step 2: Run the service tests and verify RED**

Run:

```bash
mvn -q -Dtest=ReservationServiceTest test
```

Expected: compilation fails because `customerCancel(Reservation, String, String)` does not exist.

- [ ] **Step 3: Add the shared cancellation overload and delegate the Web path**

Replace the existing `customerCancel(Long, String)` body and add the overload:

```java
@Transactional
public void customerCancel(Long reservationId, String cancelReason) {
    UserData currentUser = userDataService.getCurrentUser();
    Reservation reservation = reservationRepo.findByIdAndUser(reservationId, currentUser)
            .orElseThrow(() -> new IllegalArgumentException(
                    "找不到您的預約或無權限操作: " + reservationId));
    customerCancel(reservation, cancelReason, currentUser.getUsername());
}

@Transactional
public void customerCancel(Reservation reservation, String cancelReason, String updatedBy) {
    if (isEnded(reservation)) {
        markCompleted(reservation);
        throw new IllegalStateException("已完成的預約不可取消");
    }
    ReservationStatus currentStatus = reservation.getStatus();
    if (currentStatus == PENDING) {
        reservation.setStatus(CANCELLED);
        reservation.setCancelledAt(LocalDateTime.now());
        reservation.setCancelReason(null);
    } else if (currentStatus == CONFIRMED) {
        String reason = cancelReason == null ? "" : cancelReason.trim();
        if (reason.isBlank()) {
            throw new IllegalArgumentException("已確認預約必須提供取消原因");
        }
        reservation.setStatus(CANCEL_REQUESTED);
        reservation.setCancelReason(reason);
    } else {
        throw new IllegalStateException("此預約狀態不可取消: " + currentStatus);
    }
    reservation.setUpdatedAt(LocalDateTime.now());
    reservation.setUpdatedBy(updatedBy);
    reservationRepo.save(reservation);
    reservationNotificationService.notifyBusinessOfCustomerChange(reservation);
}
```

- [ ] **Step 4: Run the service tests and verify GREEN**

Run:

```bash
mvn -q -Dtest=ReservationServiceTest test
```

Expected: all `ReservationServiceTest` tests pass.

- [ ] **Step 5: Commit the shared rule**

```bash
git add src/main/java/com/reservio/service/ReservationService.java src/test/java/com/reservio/service/ReservationServiceTest.java
git commit -m "refactor: share customer cancellation rules"
```

### Task 2: Improve LINE reservation card information hierarchy

**Files:**
- Modify: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java:571-612`
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java:523-557`

- [ ] **Step 1: Strengthen the reservation carousel test**

Change `myReservationsPostbackReturnsReservationCards` to declare `throws Exception`, extend it with a confirmed second reservation, assert exact card content, and write the generated Flex JSON artifact:

```java
Reservation confirmed = Reservation.builder()
        .id(100L)
        .business(business)
        .user(customer)
        .title("染髮")
        .reservationDate(LocalDate.of(2026, 6, 30))
        .startTime(LocalTime.of(14, 5, 30))
        .status(ReservationStatus.CONFIRMED)
        .build();
// Return List.of(reservation, confirmed) from the repository stub.

assertThat(reply.flexContents().toString())
        .contains("剪髮", "日期：2026-06-29", "時間：10:00", "狀態：待確認")
        .contains("染髮", "日期：2026-06-30", "時間：14:05", "狀態：已確認")
        .doesNotContain("text=我的預約", "項目：");
Files.createDirectories(Path.of("target"));
Files.writeString(
        Path.of("target/mac-7-reservation-cards-flex.json"),
        new ObjectMapper().writerWithDefaultPrettyPrinter()
                .writeValueAsString(reply.flexContents()));
```

Keep the existing cancel button style assertion.

- [ ] **Step 2: Run the focused card test and verify RED**

Run:

```bash
mvn -q -Dtest=LineReservationConversationTest#myReservationsPostbackReturnsReservationCards test
```

Expected: FAIL because cards still use `我的預約`, omit status, and render the second-bearing time without the required `HH:mm` format.

- [ ] **Step 3: Render service title, fixed time, and localized status**

Add `DateTimeFormatter` import and constant:

```java
private static final DateTimeFormatter RESERVATION_TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
```

Replace the card content construction with:

```java
String title = reservationTitle(reservation);
contents.add(text(title, "lg", "bold", "#222222"));
contents.add(text("日期：" + reservation.getReservationDate(),
        "sm", "regular", "#444444"));
contents.add(text("時間：" + reservation.getStartTime().format(RESERVATION_TIME_FORMAT),
        "sm", "regular", "#444444"));
contents.add(text("狀態：" + reservationStatusLabel(reservation.getStatus()),
        "sm", "regular", "#444444"));
```

Add these focused helpers:

```java
private String reservationTitle(Reservation reservation) {
    return Objects.requireNonNullElse(reservation.getTitle(), "預約");
}

private String reservationStatusLabel(ReservationStatus status) {
    return switch (status) {
        case PENDING -> "待確認";
        case CONFIRMED -> "已確認";
        default -> status.name();
    };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
mvn -q -Dtest=LineReservationConversationTest#myReservationsPostbackReturnsReservationCards test
```

Expected: PASS.

- [ ] **Step 5: Commit the card change**

```bash
git add src/main/java/com/reservio/line/conversation/LineReservationConversation.java src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java
git commit -m "feat: clarify LINE reservation cards"
```

### Task 3: Add confirmed-reservation cancellation conversation

**Files:**
- Modify: `src/main/java/com/reservio/line/entity/LineConversation.java:42-56`
- Modify: `src/main/java/com/reservio/line/enums/LineConversationState.java`
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java:58-175,559-590,788-795`
- Modify: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java:53-86,614-647,718-735`

- [ ] **Step 1: Add failing pending and confirmed cancellation tests**

Mock `ReservationService`, pass it after `reservationCommandService` in both test constructors, and replace the old immediate-cancellation test with:

```java
@Mock private ReservationService reservationService;

@Test
void pendingReservationCancellationCompletesImmediately() {
    LineConversation existing = conversation(LineConversationState.IDLE);
    UserData customer = UserData.builder().id(30L).build();
    Reservation reservation = ownedReservation(customer, ReservationStatus.PENDING);
    stubOwnedReservation(existing, customer, reservation);

    LineReplyMessage reply = conversationService.handlePostback(
            channel, "line-user", "reservio.action=cancel_reservation&reservationId=99");

    verify(reservationService).customerCancel(reservation, null, "LINE");
    assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
    assertThat(reply.text()).isEqualTo("您已取消「剪髮」的預約。");
}

@Test
void confirmedReservationCancellationRequestsReasonWithFourQuickReplies() {
    LineConversation existing = conversation(LineConversationState.IDLE);
    UserData customer = UserData.builder().id(30L).build();
    Reservation reservation = ownedReservation(customer, ReservationStatus.CONFIRMED);
    stubOwnedReservation(existing, customer, reservation);

    LineReplyMessage reply = conversationService.handlePostback(
            channel, "line-user", "reservio.action=cancel_reservation&reservationId=99");

    assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_CANCEL_REASON);
    assertThat(existing.getPendingCancellationReservationId()).isEqualTo(99L);
    assertThat(reply.text()).isEqualTo("請問您取消「剪髮」預約的原因？");
    assertThat(reply.options()).containsExactly(
            "時間無法配合", "臨時有事", "已不需要服務", "想改約其他時間");
    verify(reservationService, never()).customerCancel(any(), any(), any());
}

@Test
void customReasonSubmitsConfirmedCancellationRequest() {
    LineConversation existing = conversation(LineConversationState.ENTERING_CANCEL_REASON);
    existing.setPendingCancellationReservationId(99L);
    UserData customer = UserData.builder().id(30L).build();
    Reservation reservation = ownedReservation(customer, ReservationStatus.CONFIRMED);
    stubOwnedReservation(existing, customer, reservation);

    LineReplyMessage reply = conversationService.handle(
            channel, "line-user", " 改由其他廠商處理 ");

    verify(reservationService).customerCancel(reservation, "改由其他廠商處理", "LINE");
    assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
    assertThat(existing.getPendingCancellationReservationId()).isNull();
    assertThat(reply.text()).isEqualTo(
            "已收到您取消「剪髮」的申請。\n\n商家確認後，將完成取消並另行通知您。");
}
```

Add test helpers:

```java
private Reservation ownedReservation(UserData customer, ReservationStatus status) {
    return Reservation.builder()
            .id(99L).business(business).user(customer).title("剪髮")
            .reservationDate(LocalDate.of(2026, 6, 29))
            .startTime(LocalTime.of(10, 0)).status(status).build();
}

private void stubOwnedReservation(
        LineConversation conversation, UserData customer, Reservation reservation) {
    when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
            .thenReturn(Optional.of(conversation));
    when(lineCustomerService.findExistingCustomer(business, "line-user"))
            .thenReturn(Optional.of(new LineCustomerResolution(
                    LineCustomer.builder().id(3L).business(business).user(customer).build(),
                    customer,
                    false
            )));
    when(reservationRepo.findByIdAndBusiness(99L, business)).thenReturn(Optional.of(reservation));
}
```

- [ ] **Step 2: Run the cancellation tests and verify RED**

Run:

```bash
mvn -q -Dtest=LineReservationConversationTest#pendingReservationCancellationCompletesImmediately+confirmedReservationCancellationRequestsReasonWithFourQuickReplies+customReasonSubmitsConfirmedCancellationRequest test
```

Expected: compilation fails because the new state, field, service dependency, and interaction do not exist.

- [ ] **Step 3: Persist pending cancellation conversation state**

Add to `LineConversationState`:

```java
ENTERING_CANCEL_REASON,
```

Add to `LineConversation`:

```java
@Column(name = "pending_cancellation_reservation_id")
private Long pendingCancellationReservationId;
```

Add `ReservationService` as a constructor dependency immediately after `ReservationCommandService`. In `handle`, route the new state:

```java
case ENTERING_CANCEL_REASON -> enterCancellationReason(conversation, normalized);
```

Add the four reasons constant:

```java
private static final List<String> CANCELLATION_REASONS = List.of(
        "時間無法配合", "臨時有事", "已不需要服務", "想改約其他時間");
```

- [ ] **Step 4: Implement status-specific LINE orchestration**

Replace direct entity mutation in `cancelReservation` after ownership validation with:

```java
String title = reservationTitle(reservation);
if (reservation.getStatus() == ReservationStatus.PENDING) {
    try {
        reservationService.customerCancel(reservation, null, "LINE");
    } catch (IllegalStateException exception) {
        return messageFactory.text("找不到可取消的預約。");
    }
    reset(conversation);
    return messageFactory.text("您已取消「" + title + "」的預約。");
}
conversation.setPendingCancellationReservationId(reservation.getId());
conversation.setState(LineConversationState.ENTERING_CANCEL_REASON);
return cancellationReasonPrompt(title);
```

Add:

```java
private LineReplyMessage enterCancellationReason(LineConversation conversation, String reason) {
    if (reason.isBlank()) {
        return messageFactory.quickReply("請輸入取消原因。", CANCELLATION_REASONS);
    }
    LineCustomerResolution customer = lineCustomerService
            .findExistingCustomer(conversation.getBusiness(), conversation.getLineUserId())
            .orElse(null);
    Reservation reservation = customer == null ? null : ownedReservation(
            conversation,
            conversation.getPendingCancellationReservationId(),
            customer,
            List.of(ReservationStatus.CONFIRMED));
    if (reservation == null) {
        reset(conversation);
        return messageFactory.text("預約狀態已變更，請重新查詢我的預約。");
    }
    String title = reservationTitle(reservation);
    try {
        reservationService.customerCancel(reservation, reason, "LINE");
    } catch (IllegalArgumentException | IllegalStateException exception) {
        reset(conversation);
        return messageFactory.text("預約狀態已變更，請重新查詢我的預約。");
    }
    reset(conversation);
    return messageFactory.text("已收到您取消「" + title
            + "」的申請。\n\n商家確認後，將完成取消並另行通知您。");
}

private LineReplyMessage cancellationReasonPrompt(String title) {
    return messageFactory.quickReply(
            "請問您取消「" + title + "」預約的原因？", CANCELLATION_REASONS);
}
```

Extract the existing repository lookup into this helper, and call it from both `cancelReservation` and `enterCancellationReason`:

```java
private Reservation ownedReservation(
        LineConversation conversation,
        Long reservationId,
        LineCustomerResolution customer,
        List<ReservationStatus> allowedStatuses) {
    if (reservationId == null) {
        return null;
    }
    return reservationRepo.findByIdAndBusiness(reservationId, conversation.getBusiness())
            .filter(candidate -> candidate.getUser() != null)
            .filter(candidate -> candidate.getUser().getId() != null)
            .filter(candidate -> candidate.getUser().getId()
                    .equals(customer.reservationUser().getId()))
            .filter(candidate -> allowedStatuses.contains(candidate.getStatus()))
            .orElse(null);
}
```

The postback call uses `List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)`; reason submission uses `List.of(ReservationStatus.CONFIRMED)`. Update `reset` to call:

```java
conversation.setPendingCancellationReservationId(null);
```

- [ ] **Step 5: Run the cancellation tests and verify GREEN**

Run:

```bash
mvn -q -Dtest=LineReservationConversationTest#pendingReservationCancellationCompletesImmediately+confirmedReservationCancellationRequestsReasonWithFourQuickReplies+customReasonSubmitsConfirmedCancellationRequest test
```

Expected: all three tests pass.

- [ ] **Step 6: Add error and reset regression tests**

Add these regression tests:

```java
@Test
void blankCancellationReasonKeepsConversationWaiting() {
    LineConversation existing = conversation(LineConversationState.ENTERING_CANCEL_REASON);
    existing.setPendingCancellationReservationId(99L);
    when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
            .thenReturn(Optional.of(existing));

    LineReplyMessage reply = conversationService.handle(channel, "line-user", "   ");

    assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_CANCEL_REASON);
    assertThat(existing.getPendingCancellationReservationId()).isEqualTo(99L);
    assertThat(reply.options()).containsExactlyElementsOf(CANCELLATION_REASONS_FOR_TEST);
    verify(reservationService, never()).customerCancel(any(), any(), any());
}

@Test
void changedReservationStateClearsPendingCancellation() {
    LineConversation existing = conversation(LineConversationState.ENTERING_CANCEL_REASON);
    existing.setPendingCancellationReservationId(99L);
    UserData customer = UserData.builder().id(30L).build();
    Reservation reservation = ownedReservation(customer, ReservationStatus.CANCEL_REQUESTED);
    stubOwnedReservation(existing, customer, reservation);

    LineReplyMessage reply = conversationService.handle(channel, "line-user", "臨時有事");

    assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
    assertThat(existing.getPendingCancellationReservationId()).isNull();
    assertThat(reply.text()).contains("預約狀態已變更");
    verify(reservationService, never()).customerCancel(any(), any(), any());
}
```

Define this test constant:

```java
private static final List<String> CANCELLATION_REASONS_FOR_TEST = List.of(
        "時間無法配合", "臨時有事", "已不需要服務", "想改約其他時間");
```

At the start of `cancelAndExpiredConversationDoNotContinueOldState`, set the pending ID before the expiry path and assert it is cleared:

```java
existing.setPendingCancellationReservationId(99L);
LineReplyMessage expired = conversationService.handle(channel, "line-user", "0912345678");
assertThat(existing.getPendingCancellationReservationId()).isNull();
```

Before the manual cancellation path, set it again and assert it is cleared:

```java
existing.setPendingCancellationReservationId(99L);
LineReplyMessage cancelled = conversationService.handle(channel, "line-user", "取消");
assertThat(existing.getPendingCancellationReservationId()).isNull();
```

- [ ] **Step 7: Run all LINE conversation tests**

Run:

```bash
mvn -q -Dtest=LineReservationConversationTest test
```

Expected: all `LineReservationConversationTest` tests pass.

- [ ] **Step 8: Commit the conversation flow**

```bash
git add src/main/java/com/reservio/line/entity/LineConversation.java src/main/java/com/reservio/line/enums/LineConversationState.java src/main/java/com/reservio/line/conversation/LineReservationConversation.java src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java
git commit -m "feat: add LINE cancellation request flow"
```

### Task 4: Verify construction sites and run full regression

**Files:**
- Modify: `src/test/java/com/reservio/line/LineReservationIntegrationTest.java:129-140`
- Verify: all files changed by Tasks 1-3

- [ ] **Step 1: Run compilation after updating constructor call sites**

Run:

```bash
mvn -q -DskipTests compile test-compile
```

Expected: compile and test-compile pass after Task 3 updates both unit and integration-test constructors.

- [ ] **Step 2: Update the integration-test constructor**

Import `ReservationService` and pass a mock after `reservationCommandService`:

```java
LineReservationConversation conversation = new LineReservationConversation(
        conversationRepo,
        serviceRepo,
        reservationRepo,
        reservationTimeService,
        reservationCommandService,
        mock(ReservationService.class),
        customerService,
        mock(LineAccountLinkService.class),
        new LineMessagingProperties(encryptionKey, "https://www.reserv-io.com"),
        new LineMessageFactory()
);
```

- [ ] **Step 3: Run focused feature tests**

Run:

```bash
mvn -q -Dtest=ReservationServiceTest,LineReservationConversationTest,LineReservationIntegrationTest test
```

Expected: all focused tests pass with no failures or errors.

- [ ] **Step 4: Run the complete test suite**

Run:

```bash
mvn test -Dtest='!DatabaseConnectionTest'
```

Expected: Maven exits with `BUILD SUCCESS`; all 135 tests outside the pre-existing `DatabaseConnectionTest` environment failure pass.

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Expected: no whitespace errors; only the MAC-7 design, plan, entity/state, service, LINE conversation, and related test files are present.

- [ ] **Step 6: Commit the integration wiring repair**

```bash
git add src/test/java/com/reservio/line/LineReservationIntegrationTest.java
git commit -m "test: update LINE conversation integration wiring"
```
