# LINE Linked Customer Prefill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skip redundant name and phone prompts for linked LINE customers while retaining fallback prompts for missing data.

**Architecture:** Add a read-only prefill query to `LineCustomerService`. The conversation state machine applies the prefill after time selection and routes to the first missing field or directly to confirmation.

**Tech Stack:** Java 17, Spring Boot, Spring Data JPA, JUnit 5, Mockito

---

### Task 1: Linked customer prefill lookup

**Files:**
- Create: `src/main/java/com/reservio/line/service/LineCustomerPrefill.java`
- Modify: `src/main/java/com/reservio/line/service/LineCustomerService.java`
- Test: `src/test/java/com/reservio/line/service/LineCustomerServiceTest.java`

- [ ] Add a failing test proving only a `LineCustomer` with non-null `linkedUser` returns prefill data.
- [ ] Run `mvn -Dtest=LineCustomerServiceTest test` and verify RED.
- [ ] Implement `findLinkedPrefill(businessId, lineUserId)` returning normalized nullable name and phone.
- [ ] Run the focused test and verify GREEN.

### Task 2: Conversation state routing

**Files:**
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] Add failing tests for complete, name-only, phone-only, empty, and unlinked prefill cases.
- [ ] Run `mvn -Dtest=LineReservationConversationTest test` and verify RED.
- [ ] Apply prefill after valid time selection and route to `CONFIRMING`, `ENTERING_NAME`, or `ENTERING_PHONE`.
- [ ] Extract confirmation-summary creation and support name entry when phone is already prefilled.
- [ ] Run focused tests and verify GREEN.

### Task 3: Verification and release readiness

**Files:**
- Verify all changed files

- [ ] Run `mvn -Dtest='*Test,!DatabaseConnectionTest' test`.
- [ ] Run `git diff --check`.
- [ ] Commit the implementation and documentation.
