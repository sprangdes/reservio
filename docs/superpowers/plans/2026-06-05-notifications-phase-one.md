# Notifications Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent website notifications, verified-email delivery, reservation event notifications, and fixed two-hour reminders.

**Architecture:** Reservation changes create durable `Notification` records and optional queued `NotificationDelivery` records. Scheduled workers create idempotent reminders, deliver queued email without blocking reservation APIs, retry failures, and delete notifications older than 90 days.

**Tech Stack:** Spring Boot, Spring Data JPA, Spring Scheduling, JavaMailSender, React, TypeScript.

---

### Task 1: Notification Core
- [ ] Add notification event/channel/status enums and entities.
- [ ] Add repositories with recipient, unread, expiry, delivery, and idempotency queries.
- [ ] Add notification preference defaults and core notification service tests.

### Task 2: Reservation Events And Reminders
- [ ] Create website notifications for reservation creation and user-driven status changes.
- [ ] Enforce business ownership when updating reservation status.
- [ ] Add idempotent two-hour reminders for confirmed reservations.
- [ ] Do not notify for system-completed reservations.

### Task 3: Notification And Preference APIs
- [ ] Add paginated notification list, unread count, mark-read, and mark-all-read endpoints.
- [ ] Add notification preference read/update endpoints.
- [ ] Add Email verification request/verify endpoints with OTP purpose isolation.

### Task 4: Email Delivery Worker
- [ ] Add reservation notification email renderer and sender.
- [ ] Queue email only for verified recipients with enabled event preference.
- [ ] Add scheduled delivery with bounded retries and failure recording.
- [ ] Add 90-day cleanup worker.

### Task 5: Frontend
- [ ] Add notification API client methods and types.
- [ ] Add navbar unread badge.
- [ ] Add notification center with pagination and read actions.
- [ ] Add notification settings and Email verification UI.

### Task 6: Verification
- [ ] Run focused and complete backend tests where environment permits.
- [ ] Run frontend typecheck and production build.
- [ ] Run `git diff --check` and review changed files.
