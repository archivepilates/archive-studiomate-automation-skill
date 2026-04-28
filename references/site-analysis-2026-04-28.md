# StudioMate Site Analysis - 2026-04-28

This analysis combines public StudioMate pages with read-only Playwright inventory of the logged-in Archive Pilates admin site.

## Scope

Read-only routes inspected:

- `/schedule`
- `/lectures`
- `/users`
- `/products`
- `/sales`

No reservation, cancellation, message sending, ticket extension, or sales export action was executed during this inventory.

## Core Navigation

The logged-in admin UI exposes these major work areas:

- `일정`
- `수업`
- `회원`
- `강사`
- `수강권`
- `메시지`
- `게시판`
- `설정`
- `매출`

## Page Notes

### Schedule

Purpose:

- calendar-style class schedule
- lesson detail popup
- member lookup inside a lesson
- lesson-level booking and attendance/member list checks

Useful controls observed:

- `이번주`
- `강사별보기`
- `휴일설정`
- `달력 설정`
- `회원 보기`
- `회원 목록`
- `자세히 보기`

Automation fit:

- Good for exact lesson-level booking and post-click confirmation.
- Slower for full monthly work because it requires week navigation and individual lesson opening.

### Lectures

Purpose:

- table/list-style class management
- filtering by date/time/teacher/class/type/room
- Excel export appears available from this page

Useful controls observed:

- `적용`
- `수업시간 전체`
- `수업 삭제`
- `일괄 수정`
- `엑셀 다운`

Automation fit:

- Best first target for monthly lesson inventory.
- Use before booking to mark `수업미생성` or center-closure rows so booking scripts do less work.
- `수업 삭제` and `일괄 수정` are write operations and require `CONFIRM=true`.

### Users

Purpose:

- member search and filtering
- member detail navigation
- member Excel download
- entry point for member-level bulk booking

Useful controls observed:

- `엑셀다운로드`
- `적용`
- `미방문일수 전체`
- `잔여기간 전체`
- `잔여횟수 전체`
- `회원 이름 또는 전화번호 검색`

Automation fit:

- Best entry point for member-level bulk booking.
- Also useful for member/ticket state checks before booking.
- Message-related controls can appear for filtered or selected members; scripts must not auto-send messages.

### Products

Purpose:

- ticket/product management
- ticket bulk extension

Useful controls observed:

- `전체 선택`
- `수강권 일괄 연장`
- `수강권명 검색`

Automation fit:

- Candidate page for ticket inventory and extension target extraction.
- Bulk extension must be previewed as a table first and require explicit confirmation.

### Sales

Purpose:

- sales, points, and reports according to the public StudioMate site

Observed behavior:

- The route loaded, but the visible UI included password-style input text and `로그인 연장`.

Automation fit:

- Treat as protected and sensitive.
- If Excel download is available after protected entry, scripts may support download and CSV conversion, but raw sales exports must stay local and uncommitted.

## Recommended Automation Order

1. Build read-only extractors first:
   - schedule inventory
   - lectures list export
   - users/products/sales inventory
2. Use lecture inventory to pre-classify no-work rows:
   - center holiday
   - class not created
   - closure or special schedule issue
   - expired ticket dates
3. Prefer member-level bulk booking for monthly fixed reservations.
4. Use lesson-level booking only for leftovers and retries.
5. Keep all write flows behind `DRY_RUN=true` and `CONFIRM=true`.

## Evidence Location

The raw read-only inventory from this run is stored locally outside the skill repository under:

- `studiomate-automation/debug/site-inventory/site-inventory.json`

Do not commit that raw inventory, screenshots, or HTML because logged-in pages may include customer data.
