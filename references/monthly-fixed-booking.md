# Monthly Fixed Booking Workflow

This workflow is for monthly fixed reservations based on a Google Sheet.

## Sheet Shape

Preferred working-data columns:

1. `예약월`
2. `예약일`
3. `요일`
4. `시간`
5. `이름`
6. `전화번호`
7. `강사`
8. `초기상태`
9. `확인메모`
10. `원본행`
11. `원본메모`
12. `예약키`
13. `실행상태`
14. `실행로그`
15. `처리시각`

Allowed `실행상태` values normally are:

- `승인`
- `제외`
- `완료`
- `실패`
- `중복`
- `확인필요`

## Faster Standard Order

1. Build or read the monthly working-data sheet.
2. Collect the target month lesson inventory from StudioMate before booking.
   - Bulk booking pages can expose a broad available lesson list after selecting a valid ticket.
   - Schedule page can also be inspected week by week, but this is slower.
3. Mark non-bookable rows before live booking:
   - center holidays
   - missing or deleted lessons
   - fixed-cancel notes
   - ticket-expired rows
4. Group remaining rows by member.
5. For each member, use bulk booking first:
   - open member detail
   - click `일괄예약`
   - choose the shortest remaining usable ticket
   - select that member's target lessons
   - submit only after selected lessons match the queue
   - first validate the member flow with `npm run bulk:member:dry-run -- --member "<name>"`
6. Use lesson-level booking only for rows not possible via bulk booking.
7. Retry failures individually once after the main pass.
8. Update sheet execution columns and re-read them for verification.

## Ticket Selection Rule

When multiple tickets are visible:

1. Prefer `사용중` over `사용예정`.
2. Among usable tickets, choose the shortest remaining valid period.
3. If the selected ticket has insufficient `예약가능`, book what fits and record remaining rows as `확인필요`.
4. If a row date is after a known ticket expiration and no later valid ticket should be used, mark it `제외`.

## Lesson Inventory Rule

Before booking, normalize lesson keys:

`YYYY-MM-DD|HH:mm|teacher`

If a fixed-reservation row has no matching lesson key in the monthly inventory:

- If the date is known center holiday, mark `제외 / 센터휴무로 고정예약 제외`.
- If the lesson appears uncreated or deleted, mark according to user instruction, commonly `제외 / 수업미생성으로 고정예약 제외`.
- If unsure, mark `확인필요` rather than trying to book a different lesson.

## Final Verification

After work, report:

- total rows
- `완료`
- `중복`
- `제외`
- `확인필요`
- any rows still requiring manual action
