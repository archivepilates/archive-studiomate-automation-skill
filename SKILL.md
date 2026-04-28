---
name: studiomate-automation
description: Use when automating StudioMate for Archive Pilates, especially monthly fixed-class reservations, member bulk booking, lesson availability audits, failure retries, and Google Sheets status updates. Covers Playwright browser automation patterns, safety rules, site structure, and standard booking workflows without storing login sessions or customer data.
---

# StudioMate Automation

Use this skill for Archive Pilates StudioMate automation work.

## Hard Rules

- Never commit or share `.auth/`, browser storage state, cookies, screenshots, raw HTML, debug logs, customer phone lists, payment data, or full booking queues.
- Use Node.js and Playwright for browser automation.
- Use `STUDIOMATE_ID` and `STUDIOMATE_PW` environment variables for automated login when possible.
- Support Playwright storage state save/load so agents can reuse a local login session.
- Always support `DRY_RUN=true` for write-capable workflows. In dry-run mode, print planned actions and do not click final action buttons.
- Require `CONFIRM=true` for booking, cancellation, bulk extension, or other service-impacting clicks.
- Treat every live booking click as service-impacting. Say what will be booked before running it.
- Prefer read/inspect/dry-run first. Use live booking only when the user clearly authorizes it.
- Update the work sheet after live work with `완료`, `중복`, `제외`, or `확인필요`.
- Do not force ambiguous bookings. If member identity, ticket, lesson, or post-click confirmation is unclear, mark `확인필요`.
- Never auto-send SMS/messages. Message automation is limited to template creation, target extraction, and preview; final sending must remain manual or disabled.

## Required References

Read only the references needed for the task:

- `references/site-map.md`: StudioMate pages, selectors, and known UI structure.
- `references/site-analysis-2026-04-28.md`: Read-only site inventory and current automation implications.
- `references/automation-priorities.md`: Archive Pilates StudioMate automation priority order and Excel/download-first read rule.
- `references/automation-requirements.md`: Standard Node.js + Playwright requirements for extraction, booking, member/ticket management, and messages.
- `references/public-sources.md`: Public StudioMate sources downloaded or checked for manual-like information.
- `references/drive-ai-hub.md`: Google Drive AI Hub operating-board workflow and storage separation.
- `references/monthly-fixed-booking.md`: Standard monthly fixed-reservation workflow.
- `references/failure-rules.md`: Status classification and retry policy.
- `references/security-and-handoff.md`: GitHub, cross-computer handoff, and secret hygiene.

## Automation Priority Order

1. Monthly lesson creation
2. Monthly fixed-reservation creation
3. Weekly notice posting
4. Weekly reservation-window settings: `설정 -> 운영정보 -> 예약 가능 기한`
5. Daily reservation-history download and upload: `수업 -> 예약내역 -> 다운로드`
6. Monthly settlement-closing sales download and upload: 수강권매출, 수업매출

For read-heavy tasks, prefer StudioMate Excel/download features first, then analyze the downloaded file locally. Use screen scraping mainly for write-flow testing, missing download features, or quick one-off checks.

## Default Monthly Booking Workflow

1. Confirm the target month and the Google Sheet/tab.
2. Confirm monthly lessons exist; if not, handle monthly lesson creation first.
3. Read the fixed-reservation data and current execution columns.
4. Inspect the target month lesson inventory before booking, preferably by Excel/download export when available.
5. Mark non-work items before execution:
   - center holidays as `제외 / 센터휴무로 고정예약 제외`
   - missing lessons as `제외` or `확인필요` according to the user rule
   - fixed-cancel memo dates as `제외 / 메모상 해당일 고정취소`
   - dates after ticket expiration as `제외 / 수강권 만료일 YYYY-MM-DD 이후 고정제외`
6. Prefer member-level bulk booking:
   - `회원` -> search member -> member detail -> `일괄예약`
   - select the active ticket with the shortest remaining valid period
   - select all matching target lessons for that member
7. Use lesson-level booking only for leftovers that cannot be handled by bulk booking.
8. Retry failed or `확인필요` rows individually once after the main pass.
9. Re-read the sheet and summarize counts by status.

## Local Runtime Expectations

The automation scripts usually live outside the skill in a workspace project. Keep machine-local files there:

- `.auth/studiomate.storageState.json`
- `debug/`
- `queues/`
- real Google Sheet exports
- live run results

If a missing script is needed, scaffold it in the workspace first, then promote only generic reusable pieces into this skill.

## Drive AI Hub Separation

Use Google Drive AI Hub as the main operating board.

- GitHub stores only the reusable skill, code, public-safe references, and safety rules.
- Google Drive AI Hub stores active work status, handoff notes, operation logs, current decisions, and next actions.
- Local workspaces store login sessions, raw queues, screenshots, HTML, customer data, and live run outputs.

AI Hub operation guide:

- `StudioMate 자동화 운영 기준 - AI 허브`
- https://docs.google.com/document/d/1cTkGDIIK120GchJXgV06wmFU1X4yNJ2tfQMOrg3SeuE

After StudioMate work, update the relevant work sheet and leave a public-safe operation summary in the AI Hub. Do not commit operation results to GitHub.

## Starter Scripts

This skill repository includes generic scripts for future agents:

- `scripts/login.mjs`: open StudioMate, log in with `STUDIOMATE_ID` / `STUDIOMATE_PW` when possible, and save storage state.
- `scripts/inspect-site-inventory.mjs`: read-only route inventory for core menus; writes JSON/CSV/debug artifacts locally.
- `scripts/build-queue-from-csv.mjs`: build a reservation queue from a reviewed CSV export.
- `scripts/bulk-book-member-dry-run.mjs`: open `회원 -> 회원검색 -> 일괄예약`, select a usable ticket when available, inspect available lessons, and write a local dry-run JSON result without submitting a booking.

Typical dry-run command:

```bash
STUDIOMATE_STORAGE_STATE=/path/to/studiomate.storageState.json \
DRY_RUN=true \
HEADLESS=true \
npm run bulk:member:dry-run -- --member "<member name>"
```

Expected safe statuses include:

- `DRY_RUN_READY`: bulk-booking screen and available lessons were inspected.
- `NO_USABLE_TICKET`: member detail and bulk-booking entry worked, but no usable ticket was available.
- `NO_AVAILABLE_LESSONS`: ticket selection worked, but the selected ticket exposed zero available lessons.
- `CHECK_FAILED`: the script could not safely reach or verify a required step.
