# MAC-8 Reservation List Row Clipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every shared desktop reservation list allocate its actual remaining card height to the table scrollport so the last row is fully visible.

**Architecture:** Keep `.reservation-card` as the viewport-bounded vertical container, then make its body a shrinkable column flex container. The filter keeps its natural height while `.table-responsive` consumes the remaining height and owns vertical scrolling; the existing mobile breakpoint resets this desktop layout to normal document flow.

**Tech Stack:** CSS Flexbox, Bootstrap 5, Node.js built-in test runner, React 18, TypeScript, Vite

---

### Task 1: Lock the shared reservation layout contract

**Files:**
- Create: `frontend/tests/reservation-list-layout.test.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write the failing CSS contract test**

Create `frontend/tests/reservation-list-layout.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function declarations(source, selector) {
  const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule: ${selector}`);
  return match[1];
}

test('desktop reservation lists assign remaining card height to the table scrollport', () => {
  const body = declarations(css, '.reservation-card .card-body');
  const table = declarations(css, '.reservation-card .table-responsive');

  assert.match(body, /display:\s*flex/);
  assert.match(body, /flex-direction:\s*column/);
  assert.match(body, /flex:\s*1 1 auto/);
  assert.match(body, /min-height:\s*0/);
  assert.match(body, /overflow:\s*hidden/);

  assert.match(table, /flex:\s*1 1 auto/);
  assert.match(table, /min-height:\s*0/);
  assert.match(table, /overflow-y:\s*auto/);
  assert.doesNotMatch(table, /max-height:\s*calc\(/);
});

test('mobile reservation lists return to normal document flow', () => {
  const mobileCss = css.slice(css.lastIndexOf('@media (max-width: 768px)'));
  const body = declarations(mobileCss, '.reservation-card .card-body');
  const table = declarations(mobileCss, '.reservation-card .table-responsive');

  assert.match(body, /display:\s*block/);
  assert.match(body, /min-height:\s*auto/);
  assert.match(body, /overflow:\s*visible/);
  assert.match(table, /flex:\s*none/);
  assert.match(table, /min-height:\s*auto/);
  assert.match(table, /max-height:\s*none/);
});
```

Add the script to `frontend/package.json`:

```json
"test": "node --test tests/*.test.mjs"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` from `frontend`.

Expected: FAIL because the desktop body/table flex declarations and mobile reset declarations do not exist yet.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add frontend/package.json frontend/tests/reservation-list-layout.test.mjs
git commit -m "test: cover reservation list scroll layout"
```

### Task 2: Make the table consume the card's actual remaining height

**Files:**
- Modify: `frontend/src/styles.css:387-405`
- Test: `frontend/tests/reservation-list-layout.test.mjs`

- [ ] **Step 1: Implement the desktop flex sizing**

Replace the shared body and table rules with:

```css
.reservation-card .card-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 0;
}
.reservation-card .table-responsive {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
}
```

This removes the table's independent `calc(100vh - 360px)` estimate while preserving the card's existing viewport cap.

- [ ] **Step 2: Reset desktop flex behavior at the mobile breakpoint**

Use the following mobile overrides:

```css
.reservation-card .table-responsive {
    flex: none;
    min-height: auto;
    max-height: none;
}
.reservation-card .card-body {
    display: block;
    min-height: auto;
    overflow: visible;
}
```

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `npm test` from `frontend`.

Expected: 2 tests pass, 0 fail.

- [ ] **Step 4: Run static frontend verification**

Run: `npm run typecheck && npm run build` from `frontend`.

Expected: TypeScript exits successfully and Vite produces the production bundle without errors.

- [ ] **Step 5: Commit the implementation**

```bash
git add frontend/src/styles.css
git commit -m "fix: prevent reservation list row clipping"
```

### Task 3: Verify all affected list variants

**Files:**
- Verify: `frontend/src/pages/MyReservationsPage.tsx`
- Verify: `frontend/src/pages/ManageAllPage.tsx`
- Verify: `frontend/src/pages/ManagePendingPage.tsx`
- Verify: `frontend/src/pages/ManageTodayPage.tsx`
- Verify: `frontend/src/styles.css`

- [ ] **Step 1: Verify the desktop scrollport geometry**

Run the application at a desktop viewport and inspect each affected route. For a populated table, scroll `.reservation-card .table-responsive` to its maximum `scrollTop` and evaluate:

```js
const scroller = document.querySelector('.reservation-card .table-responsive');
const lastRow = scroller?.querySelector('tbody tr:last-child');
const scrollRect = scroller?.getBoundingClientRect();
const rowRect = lastRow?.getBoundingClientRect();
({
  atBottom: scroller ? Math.abs(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop) <= 1 : false,
  lastRowVisible: Boolean(scrollRect && rowRect && rowRect.bottom <= scrollRect.bottom + 1),
});
```

Expected on `/my/reservations`, `/reservation/manage`, `/reservation/pending/manage`, and `/reservation/today/manage`: `atBottom` and `lastRowVisible` are both `true`; status badges and action buttons are not clipped; the pagination footer stays outside the scrollport.

- [ ] **Step 2: Verify mobile document flow**

At a viewport width of 768px or less, confirm `.desktop-table` is hidden, `.mobile-list` is visible, and `document.querySelector('.reservation-card .card-body').scrollHeight` is not constrained by an inner vertical scrollport.

- [ ] **Step 3: Run the final verification suite**

Run: `npm test && npm run typecheck && npm run build` from `frontend`, followed by `git diff --check` from the repository root.

Expected: 2 tests pass, typecheck and build succeed, and `git diff --check` prints no errors.
