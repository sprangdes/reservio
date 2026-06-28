# MAC-5 Flex Control Button Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give LINE reservation control buttons distinct muted semantic background colors without changing labels, layout, size, postback data, or reservation behavior.

**Architecture:** Keep the existing `button(label, data)` helper for ordinary choices and add a dedicated `controlButton(label, data, color)` helper for filled semantic actions. Apply explicit color constants at each control-button call site so presentation does not depend on Chinese labels.

**Tech Stack:** Java 17, Spring Boot 3.2.5, JUnit 5, Mockito, AssertJ, Maven

---

### Task 1: Add Flex JSON regression tests

**Files:**
- Modify: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] **Step 1: Add a recursive helper that finds a button by postback data**

Add this helper before `conversation(...)`:

```java
private Map<String, Object> buttonFor(LineReplyMessage reply, String postbackData) {
    return findButton(reply.flexContents(), postbackData).orElseThrow();
}

@SuppressWarnings("unchecked")
private Optional<Map<String, Object>> findButton(Object node, String postbackData) {
    if (node instanceof Map<?, ?> map) {
        Object actionValue = map.get("action");
        if ("button".equals(map.get("type"))
                && actionValue instanceof Map<?, ?> action
                && postbackData.equals(action.get("data"))) {
            return Optional.of((Map<String, Object>) map);
        }
        for (Object child : map.values()) {
            Optional<Map<String, Object>> match = findButton(child, postbackData);
            if (match.isPresent()) {
                return match;
            }
        }
    } else if (node instanceof List<?> list) {
        for (Object child : list) {
            Optional<Map<String, Object>> match = findButton(child, postbackData);
            if (match.isPresent()) {
                return match;
            }
        }
    }
    return Optional.empty();
}
```

- [ ] **Step 2: Add a failing test for service options and flow cancellation**

```java
@Test
void serviceFlexKeepsOptionsSecondaryAndColorsCancelRed() {
    LineConversation existing = conversation(LineConversationState.IDLE);
    when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
            .thenReturn(Optional.of(existing));
    when(serviceItemRepo.findAllByBusinessIdAndActiveTrue(8L)).thenReturn(List.of(haircut));

    LineReplyMessage reply = conversationService.handle(channel, "line-user", "立即預約");

    assertThat(buttonFor(reply, "reservio.action=select_service&serviceItemId=20"))
            .containsEntry("style", "secondary")
            .doesNotContainKey("color");
    assertThat(buttonFor(reply, "reservio.action=cancel"))
            .containsEntry("style", "primary")
            .containsEntry("height", "sm")
            .containsEntry("color", "#9A5F5F");
}
```

- [ ] **Step 3: Add a failing test for confirmation controls**

```java
@Test
void confirmationFlexUsesSemanticControlButtonColors() {
    LineConversation existing = completedInputConversation();
    when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
            .thenReturn(Optional.of(existing));

    LineReplyMessage reply = conversationService.handle(channel, "line-user", "無效操作");

    assertThat(buttonFor(reply, "reservio.action=confirm_reservation"))
            .containsEntry("style", "primary")
            .containsEntry("color", "#557A5C");
    assertThat(buttonFor(reply, "reservio.action=restart"))
            .containsEntry("style", "primary")
            .containsEntry("color", "#5F7185");
    assertThat(buttonFor(reply, "reservio.action=cancel"))
            .containsEntry("style", "primary")
            .containsEntry("color", "#9A5F5F");
}
```

- [ ] **Step 4: Extend the time selection test with exact control styles**

After the existing content assertion in `timeFlexShowsRestartAndCancelActions`, add:

```java
assertThat(buttonFor(reply, "reservio.action=select_time&time=09:00"))
        .containsEntry("style", "secondary")
        .doesNotContainKey("color");
assertThat(buttonFor(reply, "reservio.action=restart"))
        .containsEntry("style", "primary")
        .containsEntry("color", "#5F7185");
assertThat(buttonFor(reply, "reservio.action=cancel"))
        .containsEntry("style", "primary")
        .containsEntry("color", "#9A5F5F");
```

- [ ] **Step 5: Extend the reservation card test with exact cancel style and unchanged postback**

After the existing content assertion in `myReservationsPostbackReturnsReservationCards`, add:

```java
assertThat(buttonFor(reply, "reservio.action=cancel_reservation&reservationId=99"))
        .containsEntry("style", "primary")
        .containsEntry("height", "sm")
        .containsEntry("color", "#9A5F5F");
```

- [ ] **Step 6: Run the focused tests and verify RED**

Run:

```bash
mvn -Dtest=LineReservationConversationTest test
```

Expected: `serviceFlexKeepsOptionsSecondaryAndColorsCancelRed`, `confirmationFlexUsesSemanticControlButtonColors`, `timeFlexShowsRestartAndCancelActions`, and `myReservationsPostbackReturnsReservationCards` fail because control buttons still have `style=secondary` and no `color`.

### Task 2: Implement explicit semantic control styles

**Files:**
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] **Step 1: Add semantic color constants next to the control labels**

```java
private static final String CONFIRM_BUTTON_COLOR = "#557A5C";
private static final String RESTART_BUTTON_COLOR = "#5F7185";
private static final String CANCEL_BUTTON_COLOR = "#9A5F5F";
```

- [ ] **Step 2: Add the dedicated filled control-button helper**

Keep `button(label, data)` unchanged and add:

```java
private Map<String, Object> controlButton(String label, String data, String color) {
    return Map.of(
            "type", "button",
            "style", "primary",
            "height", "sm",
            "color", color,
            "action", Map.of(
                    "type", "postback",
                    "label", label,
                    "data", data,
                    "displayText", label
            )
    );
}
```

- [ ] **Step 3: Apply red to service-flow cancellation**

Replace the service-card cancellation call with:

```java
contents.add(controlButton(CANCEL, "reservio.action=cancel", CANCEL_BUTTON_COLOR));
```

- [ ] **Step 4: Apply slate and red to time-selection controls**

Replace the two time-selection control calls with:

```java
contents.add(controlButton(RESTART, "reservio.action=restart", RESTART_BUTTON_COLOR));
contents.add(controlButton(CANCEL, "reservio.action=cancel", CANCEL_BUTTON_COLOR));
```

- [ ] **Step 5: Apply all three colors to confirmation controls**

Replace the confirmation control calls with:

```java
contents.add(controlButton(CONFIRM, "reservio.action=confirm_reservation", CONFIRM_BUTTON_COLOR));
contents.add(controlButton(RESTART, "reservio.action=restart", RESTART_BUTTON_COLOR));
contents.add(controlButton(CANCEL, "reservio.action=cancel", CANCEL_BUTTON_COLOR));
```

- [ ] **Step 6: Apply red to existing-reservation cancellation**

Replace the reservation-card cancellation call with:

```java
contents.add(controlButton(
        "取消預約",
        "reservio.action=cancel_reservation&reservationId=" + reservation.getId(),
        CANCEL_BUTTON_COLOR
));
```

- [ ] **Step 7: Run the focused tests and verify GREEN**

Run:

```bash
mvn -Dtest=LineReservationConversationTest test
```

Expected: `BUILD SUCCESS` with all `LineReservationConversationTest` tests passing.

### Task 3: Verify and commit only MAC-5 changes

**Files:**
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Modify: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`
- Existing: `docs/superpowers/specs/2026-06-27-mac-5-flex-control-button-colors-design.md`

- [ ] **Step 1: Run the complete test suite**

```bash
mvn test
```

Expected: `BUILD SUCCESS` with zero failures and zero errors.

- [ ] **Step 2: Check formatting and scope**

```bash
git diff --check
git diff -- src/main/java/com/reservio/line/conversation/LineReservationConversation.java src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java
```

Expected: no whitespace errors; diff contains MAC-5 changes plus the pre-existing calendar-cell changes, which must remain unstaged.

- [ ] **Step 3: Stage only MAC-5 hunks**

```bash
git add -p src/main/java/com/reservio/line/conversation/LineReservationConversation.java
git add -p src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java
git diff --cached --check
git diff --cached
```

Select only semantic color constants, control-button call sites, `controlButton`, Flex button test cases, and `buttonFor`/`findButton`. Do not stage the pre-existing weekday/date cell padding changes or `dateCalendarUsesSameCellStructureForWeekdaysAndDates`.

- [ ] **Step 4: Commit the verified implementation**

```bash
git commit -m "feat: color LINE reservation control buttons"
```

Expected: one implementation commit containing only MAC-5 production and test changes.
