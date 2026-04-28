# StudioMate Automation Priorities

Use this order for Archive Pilates StudioMate automation unless the user gives a different urgent instruction.

## Priority Order

1. Monthly lesson creation
2. Monthly fixed-reservation creation
3. Weekly notice posting
4. Weekly reservation-window settings
   - Path: `설정 -> 운영정보 -> 예약 가능 기한`
5. Daily reservation-history export and upload
   - Path: `수업 -> 예약내역 -> 다운로드`
6. Monthly settlement-closing sales export and upload
   - Required exports: ticket sales, lesson sales

## Read And Analysis Rule

For read-heavy work, prefer StudioMate Excel/download features over screen-by-screen scraping.

Default order:

1. Use StudioMate filters and Excel/download buttons when available.
2. Save the raw downloaded file locally only.
3. Convert the file to CSV/JSON locally for analysis.
4. Upload only the reviewed output or summary to the target Google Sheet / Drive folder.
5. Keep raw exports out of GitHub and out of public/shared docs.

Use direct Playwright DOM extraction only when:

- there is no download button,
- the download is incomplete,
- the user needs an immediate one-off screen check, or
- the automation is testing a write flow such as booking or settings changes.

## Safety By Priority

Monthly lesson creation, monthly fixed reservations, notice posting, settings changes, and all upload/write steps are service-impacting.

- `DRY_RUN=true` must print the planned action and stop before the final write click.
- `CONFIRM=true` is required before actual creation, booking, posting, settings update, or upload.
- For message/SMS-like notice work, never auto-send unless the user explicitly approves the exact final publish step.

## Storage Split

- GitHub: reusable code, generic workflows, public-safe docs.
- Google Drive AI Hub: current status, operation logs, decisions, next actions.
- Local workspace: storage state, downloaded Excel files, raw CSVs, screenshots, debug outputs, customer/payment data.
