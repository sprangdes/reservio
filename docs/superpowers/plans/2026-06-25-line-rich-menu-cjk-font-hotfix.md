# LINE Rich Menu CJK Font Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure generated LINE Rich Menu images render Traditional Chinese labels instead of missing-glyph boxes in the production backend container.

**Architecture:** Install Noto CJK fonts in the backend runtime image and centralize Rich Menu font selection in `LineRichMenuService`. The service will choose the first installed preferred Traditional Chinese font that can display every menu label, then fail clearly if the runtime has no usable CJK font.

**Tech Stack:** Java 17 AWT, Spring Boot, JUnit 5, AssertJ, Docker

---

### Task 1: Add deterministic Rich Menu font selection

**Files:**
- Modify: `src/main/java/com/reservio/line/service/LineRichMenuService.java`
- Test: `src/test/java/com/reservio/line/service/LineRichMenuServiceTest.java`

- [ ] **Step 1: Write failing font-selection tests**

Add tests that provide controlled available font-family sets and verify:

```java
assertThat(LineRichMenuService.preferredFontFamily(
        Set.of("Dialog", "Noto Sans CJK TC", "PingFang TC")))
        .isEqualTo("Noto Sans CJK TC");

assertThatThrownBy(() -> LineRichMenuService.preferredFontFamily(Set.of("Dialog")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("中文字型");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
mvn -Dtest=LineRichMenuServiceTest test
```

Expected: compilation failure because `preferredFontFamily(Set<String>)` does not exist.

- [ ] **Step 3: Implement minimal font selection**

Add ordered preferred families and a package-private selector:

```java
private static final List<String> PREFERRED_FONT_FAMILIES = List.of(
        "Noto Sans CJK TC",
        "Noto Sans TC",
        "PingFang TC",
        "Microsoft JhengHei"
);

static String preferredFontFamily(Set<String> availableFamilies) {
    return PREFERRED_FONT_FAMILIES.stream()
            .filter(availableFamilies::contains)
            .findFirst()
            .orElseThrow(() -> new IllegalStateException(
                    "Rich Menu 圖片產生失敗：執行環境缺少可用的中文字型"));
}
```

Use the selected family when rendering and verify that it can display all labels with `font.canDisplayUpTo(label)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
mvn -Dtest=LineRichMenuServiceTest test
```

Expected: all `LineRichMenuServiceTest` tests pass.

### Task 2: Install the production CJK font

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Install Noto CJK in the runtime stage**

Add:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 2: Build and inspect the image**

Run:

```bash
docker build -t reservio-backend:cjk-font-test .
docker run --rm --entrypoint sh reservio-backend:cjk-font-test -c "fc-list | grep -i 'Noto Sans CJK TC'"
```

Expected: image build succeeds and `fc-list` reports the Noto Sans CJK TC family.

### Task 3: Verify the complete hotfix

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run the backend test suite**

Run:

```bash
mvn test
```

Expected: Maven exits successfully with no failing tests.

- [ ] **Step 2: Review the final diff**

Run:

```bash
git diff --check
git diff -- Dockerfile src/main/java/com/reservio/line/service/LineRichMenuService.java src/test/java/com/reservio/line/service/LineRichMenuServiceTest.java
```

Expected: no whitespace errors and only the scoped font hotfix changes.

- [ ] **Step 3: Commit**

Run:

```bash
git add Dockerfile src/main/java/com/reservio/line/service/LineRichMenuService.java src/test/java/com/reservio/line/service/LineRichMenuServiceTest.java docs/superpowers/plans/2026-06-25-line-rich-menu-cjk-font-hotfix.md
git commit -m "fix: render LINE rich menu Chinese labels"
```
