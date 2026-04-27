# StudioMate Site Map

This file records StudioMate UI structure learned from Archive Pilates automation work. Verify live UI before relying on selectors.

## Core URLs

- Schedule: `https://arcpilates.studiomate.kr/schedule`
- Members list: `https://arcpilates.studiomate.kr/users`
- Member detail: `https://arcpilates.studiomate.kr/users/detail?id=<memberId>`

## Login

Use Playwright storage state locally only. The common local path is `.auth/studiomate.storageState.json`, but it must never be committed.

## Schedule Page

Known UI:

- Navigation top menu text: `일정`, `수업`, `회원`, `강사`, `수강권`, `메시지`, `게시판`, `설정`, `매출`
- Week controls: `.calendar-controls__buttons button:has(i.el-icon-arrow-right)` and `...arrow-left`
- Lesson cards: `.fc-time-grid-event`
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

## Members Page

Known UI:

- Members list URL: `/users`
- Header/global search input: placeholder `이름 또는 전화번호로 검색`
- Members table filter input: placeholder `회원 이름 또는 전화번호 검색`
- Search result member text can be clicked and navigates to `/users/detail?id=...`

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
