# StudioMate Automation Requirements

Use these requirements when building or reviewing StudioMate automation scripts.

## Common Requirements

- Runtime: Node.js + Playwright.
- Login:
  - Use `STUDIOMATE_ID` and `STUDIOMATE_PW` environment variables when automated login is needed.
  - Support storage-state save/load for session reuse.
- Output:
  - Print terminal logs.
  - Save CSV and JSON outputs.
- Safety:
  - If `DRY_RUN=true`, print planned actions only and do not click final action buttons.
  - If an action can change bookings, cancellations, tickets, members, messages, or sales state, require `CONFIRM=true`.

## Automation Priority Order

1. Monthly lesson creation.
2. Monthly fixed-reservation creation.
3. Weekly notice posting.
4. Weekly reservation-window settings under `설정 -> 운영정보 -> 예약 가능 기한`.
5. Daily reservation-history download and upload under `수업 -> 예약내역 -> 다운로드`.
6. Monthly settlement-closing sales download and upload for ticket sales and lesson sales.

## Excel/Download-First Rule

For read-heavy tasks, prefer StudioMate Excel/download features over screen-by-screen DOM scraping.

Required pattern:

1. Apply filters in StudioMate.
2. Use Excel/download when available.
3. Convert the downloaded file to CSV/JSON locally.
4. Analyze locally and upload only reviewed outputs or summaries.
5. Keep raw Excel/CSV exports local and uncommitted.

Use DOM scraping mainly when no download is available, when testing a write flow, or when the user asks for a quick one-off screen check.

## 1. Read Automation

### 1-1. Schedule Extraction

Input:

- week value such as `2026w18`, or
- start date and end date.

Functions:

- Open `/schedule`.
- Set the week directly when possible, or move with previous/next buttons.
- Extract all schedule cards to CSV:
  - class name
  - date
  - time
  - instructor
  - type
  - room when visible
  - capacity and available count when visible
- Handle empty data, expired login, and slow page loading.

### 1-2. Lectures Extraction and Summary

Input filters:

- date range
- instructor
- class category
- room

Functions:

- Open `/lectures`.
- Apply filters on the class list tab.
- Include pagination and save every row to CSV.
- Optionally summarize unusual cases by reservation/cancellation available times.

### 1-3. Users, Products, and Sales Extraction

Apply the same read-first structure to:

- `/users`
- `/products`
- `/sales`

Sales:

- If Excel download exists, support download plus CSV conversion.
- Keep raw sales exports local and uncommitted.
- Never store secondary passwords or payment-sensitive data in the skill repository.

## 2. Booking and Cancellation Automation

### 2-1. Reservation Creation

Input:

- member name
- class name
- date and time
- optional instructor

Functions:

- Search/select the member.
- Find the nearest matching available slot, or use the specified slot.
- Before the reservation click, print:
  - member
  - class
  - date/time
  - instructor
  - ticket expected to be deducted
- In `DRY_RUN=true`, stop before the final click.
- Confirm reservation only when `CONFIRM=true`.

### 2-2. Reservation Cancellation or Change

Input:

- reservation ID, or
- member + class + date/time combination.

Functions:

- Print cancellation availability and ticket-return policy when visible.
- Only click cancellation/change controls when `CONFIRM=true`.

## 3. Member Registration and Ticket Management

Member registration:

- Accept CSV/JSON member lists.
- Validate required fields before opening the live form.
- In dry-run mode, print creation candidates only.

Ticket management:

- For bulk ticket extension, first print the target list as a table.
- Execute extension only after explicit user approval and `CONFIRM=true`.

## 4. Messages and SMS

Codex/agents may implement:

- message templates
- target extraction
- preview scripts

Agents must not automatically send SMS or messages.

Required implementation pattern:

- disable final send buttons in automation, or
- leave the sending step manual.
