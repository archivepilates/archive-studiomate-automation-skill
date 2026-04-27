---
name: studiomate-automation
description: Use when automating StudioMate for Archive Pilates, especially monthly fixed-class reservations, member bulk booking, lesson availability audits, failure retries, and Google Sheets status updates. Covers Playwright browser automation patterns, safety rules, site structure, and standard booking workflows without storing login sessions or customer data.
---

# StudioMate Automation

Use this skill for Archive Pilates StudioMate automation work.

## Hard Rules

- Never commit or share `.auth/`, browser storage state, cookies, screenshots, raw HTML, debug logs, customer phone lists, payment data, or full booking queues.
- Treat every live booking click as service-impacting. Say what will be booked before running it.
- Prefer read/inspect/dry-run first. Use live booking only when the user clearly authorizes it.
- Update the work sheet after live work with `완료`, `중복`, `제외`, or `확인필요`.
- Do not force ambiguous bookings. If member identity, ticket, lesson, or post-click confirmation is unclear, mark `확인필요`.

## Required References

Read only the references needed for the task:

- `references/site-map.md`: StudioMate pages, selectors, and known UI structure.
- `references/monthly-fixed-booking.md`: Standard monthly fixed-reservation workflow.
- `references/failure-rules.md`: Status classification and retry policy.
- `references/security-and-handoff.md`: GitHub, cross-computer handoff, and secret hygiene.

## Default Monthly Workflow

1. Confirm the target month and the Google Sheet/tab.
2. Read the fixed-reservation data and current execution columns.
3. Inspect the target month lesson inventory before booking.
4. Mark non-work items before execution:
   - center holidays as `제외 / 센터휴무로 고정예약 제외`
   - missing lessons as `제외` or `확인필요` according to the user rule
   - fixed-cancel memo dates as `제외 / 메모상 해당일 고정취소`
   - dates after ticket expiration as `제외 / 수강권 만료일 YYYY-MM-DD 이후 고정제외`
5. Prefer member-level bulk booking:
   - `회원` -> search member -> member detail -> `일괄예약`
   - select the active ticket with the shortest remaining valid period
   - select all matching target lessons for that member
6. Use lesson-level booking only for leftovers that cannot be handled by bulk booking.
7. Retry failed or `확인필요` rows individually once after the main pass.
8. Re-read the sheet and summarize counts by status.

## Local Runtime Expectations

The automation scripts usually live outside the skill in a workspace project. Keep machine-local files there:

- `.auth/studiomate.storageState.json`
- `debug/`
- `queues/`
- real Google Sheet exports
- live run results

If a missing script is needed, scaffold it in the workspace first, then promote only generic reusable pieces into this skill.
