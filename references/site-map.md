# StudioMate Site Map

This file records StudioMate UI structure learned from Archive Pilates automation work. Verify live UI before relying on selectors.

## Core URLs

- Schedule: `https://arcpilates.studiomate.kr/schedule`
- Lectures list: `https://arcpilates.studiomate.kr/lectures`
- Members list: `https://arcpilates.studiomate.kr/users`
- Member detail: `https://arcpilates.studiomate.kr/users/detail?id=<memberId>`
- Tickets/products: `https://arcpilates.studiomate.kr/products`
- Sales: `https://arcpilates.studiomate.kr/sales`

## Login

Use Playwright storage state locally only. The common local path is `.auth/studiomate.storageState.json`, but it must never be committed.

## Schedule Page

Known UI:

- Navigation top menu text: `일정`, `수업`, `회원`, `강사`, `수강권`, `메시지`, `게시판`, `설정`, `매출`
- Week controls: `.calendar-controls__buttons button:has(i.el-icon-arrow-right)` and `...arrow-left`
- Lesson cards: `.fc-time-grid-event`
- Observed buttons include `수업 보기`, `회원 보기`, `회원 목록`, `휴일설정`, `달력 설정`, `이번주`, `강사별보기`, `자세히 보기`, `저장`, `완료`.
- Observed search input placeholder: `이름 또는 전화번호로 검색`
- Lesson popover/detail text contains:
  - date like `2026. 5. 4. (월)`
  - time like `09:30~10:20`
  - instructor like `배민진 강사`
  - capacity like `2명/5명`

Lesson-level booking flow:

1. Open `/schedule`.
2. Navigate to target week.
3. Find exactly one `.fc-time-grid-event` matching date, time, and teacher.
4. Click lesson.
5. Check `.lecture-members__list` for existing member before booking.
6. Click `예약가능 회원 펼침`.
7. Search member by name first, then phone if needed.
8. Use `.bookable-members-list-item`, verify name and phone when possible.
9. Click `예약`.
10. Re-check reserved/attendance member list.

## Lectures Page

Known UI:

- Lectures list URL: `/lectures`
- Observed buttons include `적용`, `수업시간 전체`, `수업 삭제`, `일괄 수정`, `엑셀 다운`, `확인`.
- Observed filters include `선택`, `모든 요일`, `시작시각`, `종료시각`, `강사 전체`, `수업 전체`, `수업구분 전체`, `룸 전체`.

Automation notes:

- Use this page for table-style extraction, filtering, pagination, and Excel download if available.
- Treat `수업 삭제` and `일괄 수정` as write-capable controls requiring `CONFIRM=true`.
- Prefer this page for monthly lesson inventory before booking, because it can expose missing lessons faster than week-by-week schedule cards.

## Members Page

Known UI:

- Members list URL: `/users`
- Observed buttons include `엑셀다운로드`, `적용`, `미방문일수 전체`, `잔여기간 전체`, `잔여횟수 전체`.
- Header/global search input: placeholder `이름 또는 전화번호로 검색`
- Members table filter input: placeholder `회원 이름 또는 전화번호 검색`
- Search result member text can be clicked and navigates to `/users/detail?id=...`
- Other observed controls include selected/filtered member messaging inputs such as `필터된 회원에게` and `선택된 회원에게`; do not use these for automatic sending.

Member detail contains:

- Member name and phone number
- `일괄예약` button
- active tickets under `사용중인 수강권`
- ticket cards include validity, remaining days, `예약가능`, `취소가능`, and `잔여`

## Bulk Booking

Open from member detail with `일괄예약`.

Observed title and sections:

- `수업 일괄 예약하기`
- Step `01 수강권 선택`
- Step `02 수업 일정`
- Ticket cards: `.select-ticket__item`
- Active ticket cards include `사용중`, validity, remaining days, and available booking count.
- Future ticket cards can show `사용예정`.
- After selecting a valid ticket, the page lists available lessons at once.
- Lesson list text includes date, time, class title, instructor, and capacity.
- Final button text: `수업 예약 완료`

Important behavior:

- If a member has no currently usable ticket or `예약가능 0`, the flow may show `수강권 없음` or no usable booking path.
- For members with multiple tickets, choose the currently usable ticket with the shortest remaining valid period first.
- Bulk booking is preferred over lesson-level booking for monthly fixed reservations.

## Products Page

Known UI:

- Products/tickets URL: `/products`
- Observed buttons include `전체 선택` and `수강권 일괄 연장`.
- Observed filter/search input: `수강권명 검색`.

Automation notes:

- Use this page for ticket inventory and bulk extension candidate extraction.
- `수강권 일괄 연장` is service-impacting and must require an explicit target list plus `CONFIRM=true`.

## Sales Page

Known UI:

- Sales URL: `/sales`
- On 2026-04-28 inventory, this page showed a password-style prompt and `로그인 연장`.

Automation notes:

- Treat sales as a protected flow.
- If Excel download exists after the protected step, extraction scripts may download and convert it, but do not store raw payment/customer-sensitive outputs in the skill repository.
- Never bypass or persist secondary sales credentials in code.
