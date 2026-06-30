# MAC-9 LINE Account Rich Menu Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route each LINE user to an unlinked or linked Rich Menu, require LINE Login for account linking, preserve reservation ownership, and provide a customer profile editor.

**Architecture:** Each business owns an unlinked default menu and a linked per-user menu. Existing `LineCustomer -> linkedUser -> lineUserId` relations remain the source of truth; webhook processing performs idempotent account completion and retries linked-menu assignment. A focused profile service validates user-owned updates while the controller refreshes the authenticated session principal.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data JPA, Spring Security, LINE Messaging API, React 18, TypeScript, JUnit 5, Mockito, Node test runner

---

### Task 1: LINE per-user Rich Menu client operations

**Files:**
- Modify: `src/main/java/com/reservio/line/service/LineMessagingClient.java`
- Test: `src/test/java/com/reservio/line/service/LineMessagingClientTest.java`

- [ ] **Step 1: Add failing client tests**

Add tests that call:

```java
client.linkRichMenuToUser(channel, "U123", "richmenu-linked");
client.unlinkRichMenuFromUser(channel, "U123");
```

Assert POST targets `/v2/bot/user/U123/richmenu/richmenu-linked`, DELETE targets `/v2/bot/user/U123/richmenu`, and both send the bearer token.

- [ ] **Step 2: Verify RED**

Run: `mvn -Dtest=LineMessagingClientTest test`

Expected: compilation fails because the two methods do not exist.

- [ ] **Step 3: Implement the two operations**

Add methods using the existing `execute` wrapper:

```java
public void linkRichMenuToUser(BusinessLineChannel channel, String lineUserId, String richMenuId) {
    execute(channel, "link_rich_menu_to_user", () -> {
        restClient.post()
                .uri("https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}",
                        lineUserId, richMenuId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(channel))
                .retrieve().toBodilessEntity();
        return null;
    });
}

public void unlinkRichMenuFromUser(BusinessLineChannel channel, String lineUserId) {
    execute(channel, "unlink_rich_menu_from_user", () -> {
        restClient.delete()
                .uri("https://api.line.me/v2/bot/user/{userId}/richmenu", lineUserId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(channel))
                .retrieve().toBodilessEntity();
        return null;
    });
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `mvn -Dtest=LineMessagingClientTest test`

Expected: PASS.

Commit: `feat: add LINE per-user rich menu operations`

### Task 2: Provision linked and unlinked Rich Menus

**Files:**
- Modify: `src/main/java/com/reservio/line/entity/BusinessLineChannel.java`
- Modify: `src/main/java/com/reservio/line/repo/LineCustomerRepo.java`
- Modify: `src/main/java/com/reservio/line/service/LineRichMenuService.java`
- Test: `src/test/java/com/reservio/line/service/LineRichMenuServiceTest.java`

- [ ] **Step 1: Add failing dual-menu tests**

Cover these contracts:

```java
assertThat(LineRichMenuService.unlinkedRichMenuDefinition())
        .extracting("name").isEqualTo("Reservio 預約選單（未綁定）");
assertThat(LineRichMenuService.linkedRichMenuDefinition("https://www.reserv-io.com/profile"))
        .extracting("name").isEqualTo("Reservio 預約選單（已綁定）");
```

Assert the unlinked third action is postback `reservio.action=link_account`, the linked third action is URI `/profile`, provision creates and uploads two menus before changing the default, stores `linkedRichMenuId`, and reassigns all `findAllByBusinessIdAndLinkedUserIsNotNull(...)` customers.

- [ ] **Step 2: Verify RED**

Run: `mvn -Dtest=LineRichMenuServiceTest test`

Expected: compilation or assertion failure for missing dual-menu state.

- [ ] **Step 3: Add persistence and query**

Add to `BusinessLineChannel`:

```java
@Column(name = "linked_rich_menu_id", length = 100)
private String linkedRichMenuId;
```

Add to `LineCustomerRepo`:

```java
List<LineCustomer> findAllByBusinessIdAndLinkedUserIsNotNull(Long businessId);
boolean existsByBusinessIdAndLinkedUserAndIdNot(Long businessId, UserData linkedUser, Long id);
```

- [ ] **Step 4: Implement dual definitions and rendering**

Replace the single label list with menu-specific labels. Keep the first two postbacks unchanged, add `LINK_ACCOUNT_ACTION`, and use a URI action builder for the linked third area. Make `renderRichMenuImage(List<String> labels)` render either label set without duplicating drawing code.

- [ ] **Step 5: Implement safe provisioning and assignment helpers**

Provision in this order: create unlinked, upload unlinked, create linked, upload linked, set unlinked default, assign linked customers, persist both IDs, then delete superseded IDs. Add:

```java
public void assignLinkedMenu(BusinessLineChannel channel, String lineUserId)
public void removeLinkedMenu(BusinessLineChannel channel, String lineUserId)
```

Both validate that the configured menu ID exists and delegate to `LineMessagingClient`.

- [ ] **Step 6: Verify GREEN and commit**

Run: `mvn -Dtest=LineRichMenuServiceTest test`

Expected: PASS.

Commit: `feat: provision linked and unlinked LINE rich menus`

### Task 3: Rich Menu account-link entry and unlinked reservation guard

**Files:**
- Modify: `src/main/java/com/reservio/line/service/LineCustomerService.java`
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Test: `src/test/java/com/reservio/line/service/LineCustomerServiceTest.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] **Step 1: Add failing customer-resolution tests**

Test `resolveForAccountLink(business, lineUserId)` creates a synthetic customer when absent and returns an existing customer without clearing its `displayName` or `phone`.

- [ ] **Step 2: Verify RED**

Run: `mvn -Dtest=LineCustomerServiceTest test`

Expected: compilation failure for `resolveForAccountLink`.

- [ ] **Step 3: Implement account-link resolution**

Add:

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public LineCustomerResolution resolveForAccountLink(BusinessData business, String lineUserId) {
    return lineCustomerRepo.findByBusinessIdAndLineUserId(business.getId(), lineUserId)
            .map(this::resolution)
            .orElseGet(() -> resolution(createCustomer(business, lineUserId, null, null)));
}
```

Extract a private `resolution(LineCustomer)` helper so no update call receives null metadata.

- [ ] **Step 4: Add failing conversation tests**

Cover: `link_account` creates a request and returns a URI button; unlinked `my_reservations` returns the same link prompt without querying reservations; linked users still receive reservation cards; an already-linked user on a stale menu gets a success message and `assignLinkedMenu`; link-token failure returns a retryable message.

- [ ] **Step 5: Verify RED**

Run: `mvn -Dtest=LineReservationConversationTest test`

Expected: failures because account-link routing does not exist.

- [ ] **Step 6: Implement the shared prompt**

Route `link_account` and `my_reservations` through a helper shaped as:

```java
private LineReplyMessage accountLinkPrompt(BusinessLineChannel channel, String lineUserId) {
    LineCustomerResolution resolution = lineCustomerService
            .resolveForAccountLink(channel.getBusiness(), lineUserId);
    if (resolution.linked()) {
        richMenuService.assignLinkedMenu(channel, lineUserId);
        return messageFactory.text("LINE 帳號已完成綁定。");
    }
    String token = accountLinkService.create(channel, resolution.customer());
    return messageFactory.uriButton(
            "請先綁定 LINE 帳號，再查詢 Reservio 預約。",
            "使用 LINE 登入並綁定",
            accountLinkUrl(token));
}
```

Keep existing linked reservation cards and convert API failures to the retryable user message.

- [ ] **Step 7: Verify GREEN and commit**

Run: `mvn -Dtest=LineCustomerServiceTest,LineReservationConversationTest test`

Expected: PASS.

Commit: `feat: route unlinked LINE users to account linking`

### Task 4: Enforce LINE Login identity and synchronize menu state

**Files:**
- Modify: `src/main/java/com/reservio/line/service/LineAccountLinkService.java`
- Modify: `src/main/java/com/reservio/line/service/LineWebhookWorker.java`
- Test: `src/test/java/com/reservio/line/service/LineAccountLinkServiceTest.java`
- Test: `src/test/java/com/reservio/line/service/LineWebhookWorkerTest.java`

- [ ] **Step 1: Add failing identity-conflict tests**

Assert confirmation rejects `ROLE_USER` targets whose `lineUserId` is null, and completion rejects when:

```java
customerRepo.existsByBusinessIdAndLinkedUserAndIdNot(
        business.getId(), targetUser, customer.getId())
```

returns true. Verify no customer save and no reservation transfer occur.

- [ ] **Step 2: Verify RED**

Run: `mvn -Dtest=LineAccountLinkServiceTest test`

Expected: the new rejection assertions fail.

- [ ] **Step 3: Add validation and idempotent completion result**

Require nonblank `targetUser.lineUserId` in `confirm`. In `complete`, perform the same check and same-business duplicate query before mutation. Return a result record containing the `LineCustomer` and transferred count even when status is already `COMPLETED`, so webhook redelivery can retry menu assignment.

- [ ] **Step 4: Add failing worker menu-sync tests**

Assert a successful account-link callback calls:

```java
richMenuService.assignLinkedMenu(event.getChannel(), "U123");
```

before marking the event processed. Make the mock throw once and assert the event remains pending with an incremented attempt count; on retry, assert completion remains idempotent and assignment runs again.

- [ ] **Step 5: Implement callback synchronization**

Inject `LineRichMenuService` into `LineWebhookWorker`. After `accountLinkService.complete(...)`, call `assignLinkedMenu`. Let `LineApiException` reach existing worker retry handling; send the success reply only after assignment succeeds.

- [ ] **Step 6: Make unlink restore the default menu**

Change unlink orchestration to validate ownership, call `removeLinkedMenu`, then clear the database link transactionally. If persistence fails after the external unlink, best-effort call `assignLinkedMenu` before rethrowing.

- [ ] **Step 7: Verify GREEN and commit**

Run: `mvn -Dtest=LineAccountLinkServiceTest,LineWebhookWorkerTest test`

Expected: PASS.

Commit: `feat: enforce LINE Login account ownership`

### Task 5: Customer profile API and authenticated-principal refresh

**Files:**
- Create: `src/main/java/com/reservio/controller/request/UpdateProfileRequest.java`
- Create: `src/main/java/com/reservio/service/UserProfileService.java`
- Modify: `src/main/java/com/reservio/repo/UserDataRepo.java`
- Modify: `src/main/java/com/reservio/controller/UserController.java`
- Modify: `src/main/java/com/reservio/controller/response/UserResponse.java`
- Modify: `src/main/java/com/reservio/util/UserUtil.java`
- Test: `src/test/java/com/reservio/service/UserProfileServiceTest.java`
- Test: `src/test/java/com/reservio/controller/UserControllerTest.java`

- [ ] **Step 1: Add failing service tests**

Test trimming and lowercasing, username length 1–100, valid Email length up to 255, `ROLE_USER` only, duplicate username/Email rejection, unchanged self-values, and `emailVerified=false` only when Email changes.

- [ ] **Step 2: Verify RED**

Run: `mvn -Dtest=UserProfileServiceTest test`

Expected: compilation failure because the service does not exist.

- [ ] **Step 3: Implement request, repository queries, and service**

Use:

```java
public record UpdateProfileRequest(String username, String email) {}

boolean existsByUsernameAndIdNot(String username, Long id);
boolean existsByEmailAndIdNot(String email, Long id);
```

`UserProfileService.update` validates with a compiled Email regex, throws `IllegalArgumentException` for format problems and `UserAlreadyExistsException` for conflicts, saves the normalized values, and returns the saved user.

Add `boolean lineLoginLinked` to `UserResponse` and populate it with `user.getLineUserId() != null && !user.getLineUserId().isBlank()`. This exposes link capability to the frontend without exposing the LINE subject.

- [ ] **Step 4: Add failing controller tests**

Test `PUT /api/me/profile` returns the updated `UserResponse`, rejects business users through the service, and after a username change stores a `UsernamePasswordAuthenticationToken` with the new name in both `SecurityContextHolder` and `SecurityContextRepository`.

- [ ] **Step 5: Implement endpoint and principal refresh**

Inject `UserProfileService` and `SecurityContextRepository`. Preserve the current authentication authorities and details:

```java
UsernamePasswordAuthenticationToken refreshed =
        new UsernamePasswordAuthenticationToken(updated.getUsername(), null,
                authentication.getAuthorities());
refreshed.setDetails(authentication.getDetails());
SecurityContext context = SecurityContextHolder.createEmptyContext();
context.setAuthentication(refreshed);
SecurityContextHolder.setContext(context);
securityContextRepository.saveContext(context, request, response);
```

- [ ] **Step 6: Verify GREEN and commit**

Run: `mvn -Dtest=UserProfileServiceTest,UserControllerTest,ApiExceptionHandlerTest test`

Expected: PASS with duplicate conflicts mapped to 409 and validation to 400.

Commit: `feat: add customer profile update API`

### Task 6: Profile page and forced LINE Login linking UI

**Files:**
- Create: `frontend/src/pages/ProfilePage.tsx`
- Create: `frontend/tests/profile-page.test.mjs`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/pages/LineAccountLinkPage.tsx`

- [ ] **Step 1: Add failing source-contract tests**

Read the relevant source files and assert they contain `/profile`, `api.updateProfile`, username and Email inputs, `await refresh()`, and a LINE Login link using `${API_BASE}/api/auth/line/user`. Assert the account-link page no longer renders an account-password confirmation path.

- [ ] **Step 2: Verify RED**

Run: `npm test`

Working directory: `frontend`

Expected: FAIL because the page, route, and API method do not exist.

- [ ] **Step 3: Add API and protected route**

Add:

```ts
updateProfile: (payload: { username: string; email: string }) =>
  request('/api/me/profile', { method: 'PUT', body: JSON.stringify(payload) })
```

Register `/profile` inside `Layout` and `RequireAuth`.

- [ ] **Step 4: Implement ProfilePage**

Initialize local values from `me`, submit normalized values, call `refresh()` after success, display backend errors, and show an Email re-verification notice when the Email changes. Redirect or warn if `me.role !== 'ROLE_USER'`.

- [ ] **Step 5: Force LINE Login on account-link page**

Add `lineLoginLinked?: boolean` to the frontend `AuthUser`. When the current session lacks `ROLE_USER` or `me.lineLoginLinked`, store the return path and render only:

```tsx
<a href={`${API_BASE}/api/auth/line/user`} className="btn btn-success">
  使用 LINE 登入並繼續
</a>
```

Only a `ROLE_USER` with a nonblank LINE subject may call confirm.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm test && npm run typecheck && npm run build`

Working directory: `frontend`

Expected: all commands exit 0.

Commit: `feat: add LINE-linked customer profile page`

### Task 7: Integration coverage and full verification

**Files:**
- Modify: `src/test/java/com/reservio/line/LineReservationIntegrationTest.java`
- Modify: `docs/line-messaging-setup.md`

- [ ] **Step 1: Add failing integration scenarios**

Add scenarios proving an unlinked customer receives a link prompt, completion transfers the existing reservation, linked future reservations use the formal user, duplicate same-business linking is blocked, and account-link completion assigns the linked Rich Menu.

- [ ] **Step 2: Run the focused integration test**

Run: `mvn -Dtest=LineReservationIntegrationTest test`

Expected: PASS. A failure is a regression in Tasks 1–6; correct the responsible implementation and rerun until green.

- [ ] **Step 3: Document operations**

Update setup documentation to state that provisioning creates two menus, the unlinked menu is default, linked users receive a per-user menu, and LINE Login plus Account Link are both required.

- [ ] **Step 4: Run full verification**

Run:

```bash
mvn test
npm test
npm run typecheck
npm run build
git diff --check
```

Run frontend commands from `frontend`. Expected: every command exits 0 and the working tree contains only intentional MAC-9 changes.

- [ ] **Step 5: Commit**

Commit: `test: cover MAC-9 LINE account menu routing`
