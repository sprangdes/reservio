# MAC-6 Calendar Layout and Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a stable six-row, seven-column LINE reservation calendar with larger scalable text and a larger tap target while preserving date-selection postbacks.

**Architecture:** Keep calendar generation inside `LineReservationConversation` and normalize weekday, date, and blank cells through one compact Flex box helper. Pad every month to six date rows, use equal `flex` widths, and add regression tests against the generated Flex JSON, including the LINE 50 KB carousel limit.

**Tech Stack:** Java 17, Spring Boot 3.2.5, JUnit 5, Mockito, AssertJ, Jackson, Maven

---

### Task 1: Add failing calendar-grid and accessibility tests

**Files:**
- Modify: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`
- Restore baseline before tests: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`

- [ ] **Step 1: Remove the pre-existing uncommitted calendar experiment**

Restore `weekday` and `emptyDateCell` to the committed baseline so the new tests demonstrate RED:

```java
private Map<String, Object> weekday(String label) {
    Map<String, Object> node = new LinkedHashMap<>();
    node.put("type", "text");
    node.put("text", label);
    node.put("size", "xs");
    node.put("align", "center");
    node.put("color", "#888888");
    node.put("flex", 1);
    return node;
}

private Map<String, Object> emptyDateCell() {
    Map<String, Object> cell = new LinkedHashMap<>();
    cell.put("type", "box");
    cell.put("layout", "vertical");
    cell.put("flex", 1);
    cell.put("contents", List.of(text(" ", "sm", "regular", "#BBBBBB")));
    return cell;
}
```

Delete the existing `dateCalendarUsesSameCellStructureForWeekdaysAndDates` test; the tests below replace it with complete MAC-6 coverage.

- [ ] **Step 2: Add JSON artifact imports**

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
```

- [ ] **Step 3: Add helpers for generating and inspecting a calendar**

Add before `buttonFor(...)`:

```java
private LineReplyMessage calendarReply(Instant instant) {
    conversationService = new LineReservationConversation(
            conversationRepo,
            serviceItemRepo,
            reservationRepo,
            reservationTimeService,
            reservationCommandService,
            lineCustomerService,
            accountLinkService,
            new LineMessagingProperties("ignored", "https://www.reserv-io.com"),
            new LineMessageFactory(),
            Clock.fixed(instant, ZoneId.of("Asia/Taipei"))
    );
    LineConversation existing = conversation(LineConversationState.SELECTING_SERVICE);
    when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
            .thenReturn(Optional.of(existing));
    when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
    return conversationService.handlePostback(
            channel,
            "line-user",
            "reservio.action=select_service&serviceItemId=20"
    );
}

@SuppressWarnings("unchecked")
private List<Map<String, Object>> calendarBubbles(LineReplyMessage reply) {
    return (List<Map<String, Object>>) reply.flexContents().get("contents");
}

@SuppressWarnings("unchecked")
private List<Map<String, Object>> bodyContents(Map<String, Object> bubble) {
    Map<String, Object> body = (Map<String, Object>) bubble.get("body");
    return (List<Map<String, Object>>) body.get("contents");
}

@SuppressWarnings("unchecked")
private List<Map<String, Object>> rowCells(Map<String, Object> row) {
    return (List<Map<String, Object>>) row.get("contents");
}

@SuppressWarnings("unchecked")
private Map<String, Object> cellLabel(Map<String, Object> cell) {
    return ((List<Map<String, Object>>) cell.get("contents")).get(0);
}

private Map<String, Object> dateCellFor(Map<String, Object> bubble, String day) {
    return bodyContents(bubble).stream()
            .skip(2)
            .flatMap(row -> rowCells(row).stream())
            .filter(cell -> day.equals(cellLabel(cell).get("text")))
            .findFirst()
            .orElseThrow();
}
```

- [ ] **Step 4: Add a failing test for four-, five-, and six-week months**

February through May 2026 contains naturally four-, five-, and six-week month layouts.

```java
@Test
void dateCalendarNormalizesFourFiveAndSixWeekMonthsToSixRows() {
    LineReplyMessage reply = calendarReply(Instant.parse("2026-01-31T16:00:00Z"));

    List<Map<String, Object>> bubbles = calendarBubbles(reply);
    assertThat(bubbles).hasSize(4);
    assertThat(bubbles).allSatisfy(bubble -> {
        List<Map<String, Object>> contents = bodyContents(bubble);
        assertThat(contents).hasSize(8);
        assertThat(contents.subList(1, 8)).allSatisfy(row ->
                assertThat(rowCells(row)).hasSize(7));
    });

    List<Map<String, Object>> februaryContents = bodyContents(bubbles.get(0));
    assertThat(cellLabel(rowCells(februaryContents.get(2)).get(0)).get("text"))
            .isEqualTo("1");
    assertThat(cellLabel(rowCells(februaryContents.get(5)).get(6)).get("text"))
            .isEqualTo("28");
    assertThat(cellLabel(rowCells(februaryContents.get(6)).get(0)).get("text"))
            .isEqualTo(" ");
}
```

- [ ] **Step 5: Add a failing test for the unified cell layout and readable text**

```java
@Test
@SuppressWarnings("unchecked")
void dateCalendarUsesReadableEqualWidthCells() {
    LineReplyMessage reply = calendarReply(Instant.parse("2026-01-31T16:00:00Z"));
    Map<String, Object> bubble = calendarBubbles(reply).get(0);
    Map<String, Object> body = (Map<String, Object>) bubble.get("body");

    assertThat(bubble).containsEntry("size", "giga");
    assertThat(body)
            .containsEntry("paddingAll", "12px")
            .containsEntry("spacing", "xs");

    List<Map<String, Object>> rows = bodyContents(bubble).subList(1, 8);
    assertThat(rows).allSatisfy(row -> {
        assertThat(row).containsEntry("spacing", "2px");
        assertThat(rowCells(row)).allSatisfy(cell -> assertThat(cell)
                .containsEntry("type", "box")
                .containsEntry("layout", "vertical")
                .containsEntry("paddingAll", "8px")
                .containsEntry("flex", 1));
    });

    Map<String, Object> weekdayLabel = cellLabel(rowCells(rows.get(0)).get(0));
    assertThat(weekdayLabel)
            .containsEntry("size", "sm")
            .containsEntry("scaling", true)
            .containsEntry("adjustMode", "shrink-to-fit");

    assertThat(cellLabel(dateCellFor(bubble, "1")))
            .containsEntry("size", "md")
            .containsEntry("scaling", true)
            .containsEntry("adjustMode", "shrink-to-fit");
    assertThat(cellLabel(dateCellFor(bubble, "10")))
            .containsEntry("size", "md")
            .containsEntry("scaling", true)
            .containsEntry("adjustMode", "shrink-to-fit");
}
```

- [ ] **Step 6: Add a failing test for unchanged postback and JSON size**

```java
@Test
@SuppressWarnings("unchecked")
void dateCalendarPreservesPostbackAndStaysWithinLineCarouselLimit() throws Exception {
    when(reservationTimeService.isBusinessOpen(any(LocalDate.class), eq(8L))).thenReturn(true);
    when(reservationTimeService.getTimeSlotsForDate(any(LocalDate.class), eq(60), eq(8L)))
            .thenReturn(List.of(new TimeSlotResponse("10:00", true)));

    LineReplyMessage reply = calendarReply(Instant.parse("2026-01-31T16:00:00Z"));
    Map<String, Object> cell = dateCellFor(calendarBubbles(reply).get(0), "10");
    Map<String, Object> action = (Map<String, Object>) cell.get("action");
    ObjectMapper objectMapper = new ObjectMapper();

    assertThat(action)
            .containsEntry("type", "postback")
            .containsEntry("label", "10")
            .containsEntry("data", "reservio.action=select_date&date=2026-02-10")
            .containsEntry("displayText", "2026-02-10");
    assertThat(objectMapper.writeValueAsBytes(reply.flexContents()).length)
            .isLessThan(50 * 1024);
    Files.createDirectories(Path.of("target"));
    Files.writeString(
            Path.of("target/mac-6-calendar-flex.json"),
            objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(reply.flexContents())
    );
}
```

- [ ] **Step 7: Run the focused tests and verify RED**

Run:

```bash
mvn -Dtest=LineReservationConversationTest test
```

Expected: the new tests fail because months do not have six rows, weekday cells are text rather than boxes, bubble/body/row sizing properties are absent, and calendar text remains `xs`/`sm` without scaling.

### Task 2: Implement the normalized accessible Flex calendar

**Files:**
- Modify: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`

- [ ] **Step 1: Add calendar layout constants near the existing labels**

```java
private static final int CALENDAR_COLUMNS = 7;
private static final int CALENDAR_WEEK_ROWS = 6;
```

- [ ] **Step 2: Pad every month to six rows and set the bubble/body size**

After flushing the final partial row in `monthBubble`, append:

```java
int dateRowCount = contents.size() - 2;
while (dateRowCount < CALENDAR_WEEK_ROWS) {
    List<Map<String, Object>> emptyRow = new ArrayList<>();
    for (int column = 0; column < CALENDAR_COLUMNS; column++) {
        emptyRow.add(emptyDateCell());
    }
    contents.add(row(emptyRow));
    dateRowCount++;
}
```

Replace the body and bubble return with:

```java
Map<String, Object> body = new LinkedHashMap<>();
body.put("type", "box");
body.put("layout", "vertical");
body.put("spacing", "xs");
body.put("paddingAll", "12px");
body.put("contents", contents);
return Map.of(
        "type", "bubble",
        "size", "giga",
        "body", body
);
```

- [ ] **Step 3: Normalize row spacing and all calendar cells**

Replace `weekday`, `row`, and `emptyDateCell`, and add the two compact helpers:

```java
private Map<String, Object> weekday(String label) {
    return calendarCell(calendarText(label, "sm", "bold", "#666666"));
}

private Map<String, Object> row(List<Map<String, Object>> cells) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("type", "box");
    row.put("layout", "horizontal");
    row.put("spacing", "2px");
    row.put("contents", cells);
    return row;
}

private Map<String, Object> emptyDateCell() {
    return calendarCell(calendarText(" ", "md", "regular", "#BBBBBB"));
}

private Map<String, Object> calendarCell(Map<String, Object> label) {
    Map<String, Object> cell = new LinkedHashMap<>();
    cell.put("type", "box");
    cell.put("layout", "vertical");
    cell.put("paddingAll", "8px");
    cell.put("flex", 1);
    cell.put("contents", List.of(label));
    return cell;
}

private Map<String, Object> calendarText(
        String value,
        String size,
        String weight,
        String color) {
    Map<String, Object> label = new LinkedHashMap<>();
    label.put("type", "text");
    label.put("text", value);
    label.put("size", size);
    label.put("weight", weight);
    label.put("align", "center");
    label.put("color", color);
    label.put("scaling", true);
    label.put("adjustMode", "shrink-to-fit");
    return label;
}
```

- [ ] **Step 4: Build real date cells from the shared cell helper**

Replace label and cell construction in `dateCell` with:

```java
Map<String, Object> cell = calendarCell(calendarText(
        String.valueOf(date.getDayOfMonth()),
        "md",
        "regular",
        selectable ? "#1DB446" : "#C8C8C8"
));
```

Keep the existing selectable action block exactly as written so `label`, `data`, and `displayText` do not change.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
mvn -Dtest=LineReservationConversationTest test
```

Expected: `BUILD SUCCESS`; all calendar structure, readability, postback, and payload-size assertions pass.

- [ ] **Step 6: Commit the tested implementation**

```bash
git add src/main/java/com/reservio/line/conversation/LineReservationConversation.java \
  src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java
git commit -m "fix: improve LINE reservation calendar layout"
```

### Task 3: Verify the full project and prepare simulator JSON

**Files:**
- Existing: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Existing: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`
- Existing: `docs/superpowers/specs/2026-06-28-mac-6-calendar-layout-readability-design.md`

- [ ] **Step 1: Run the complete Maven suite**

```bash
mvn test
```

Expected: `BUILD SUCCESS` with zero failures and zero errors.

- [ ] **Step 2: Check scope and whitespace**

```bash
git diff --check HEAD~1 HEAD
git show --stat --oneline HEAD
git status --short --branch
```

Expected: no whitespace errors; the implementation commit contains only the conversation and test files; the branch is `feature/mac-6-calendar-layout-readability`.

- [ ] **Step 3: Copy the generated simulator-ready Flex JSON outside the repository**

The focused test writes only `reply.flexContents()` to the ignored Maven build directory. Copy it to `/tmp`:

```bash
cp target/mac-6-calendar-flex.json /tmp/mac-6-calendar-flex.json
```

Verify its top-level shape:

```json
{
  "type": "carousel",
  "contents": [
    {
      "type": "bubble",
      "size": "giga",
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "xs",
        "paddingAll": "12px",
        "contents": []
      }
    }
  ]
}
```

Open `/tmp/mac-6-calendar-flex.json` in LINE Flex Message Simulator and verify that weekday/date columns align, all bubbles have six date rows, single- and double-digit dates remain centered, and the larger cell area responds to its postback action. If simulator authentication is unavailable, report that external verification gap and retain `/tmp/mac-6-calendar-flex.json` for manual review.

- [ ] **Step 4: Update Linear MAC-6 after verification**

Add a concise comment with the branch, focused/full test results, simulator result or authentication gap, and preserved postback behavior. Move MAC-6 to the team's completed status only after all automated verification passes and simulator verification has either passed or is explicitly documented as the sole external gap.
