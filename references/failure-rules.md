# Failure Rules

Use these rules when classifying StudioMate automation outcomes.

## Statuses

`완료`
: Booking was submitted and the member was confirmed in the reserved/attendance list, or bulk booking confirms success.

`중복`
: Member is already in the reserved/attendance list. No booking click is needed.

`제외`
: The row should not be attempted. Common reasons:
  - center holiday
  - fixed-cancel memo
  - date after ticket expiration
  - confirmed missing/deleted/uncreated lesson when the user wants those skipped

`확인필요`
: Automation could not safely decide or confirm. Common reasons:
  - member not found in bookable list
  - phone/name mismatch
  - booking clicked but post-click confirmation failed
  - no valid ticket
  - ambiguous lesson match

`실패`
: Reserve for script/runtime failure where the result is unknown and the row should be retried or inspected.

## Retry Policy

1. Main pass handles all safe rows.
2. Re-run `확인필요` or `실패` rows once, after checking whether the issue was transient.
3. Do not retry rows marked `제외`.
4. If a retry finds the member already listed, mark `중복`.
5. If a retry clicks booking but cannot confirm the result, keep `확인필요` and note that post-click confirmation failed.

## Common Messages

- `센터휴무로 고정예약 제외`
- `수업미생성으로 고정예약 제외`
- `메모상 해당일 고정취소`
- `수강권 만료일 YYYY-MM-DD 이후 고정제외`
- `이미 예약/출결 목록에 있음`
- `예약가능 회원 0건: <name> <phone>`
- `예약 클릭 후 목록 확인 실패: 일시 오류 가능, 재확인 필요`

## Safety Bias

Never substitute another class with similar time, teacher, or title unless the user explicitly approves it.
