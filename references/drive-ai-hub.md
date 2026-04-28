# Google Drive AI Hub Workflow

StudioMate automation uses Google Drive AI Hub as the main operating board.

## Canonical AI Hub

- Folder: `AI 작업 허브`
- URL: https://drive.google.com/drive/folders/1XjZORT_SS3vOjgCGinkQF2byui5Fd-QV
- StudioMate guide: https://docs.google.com/document/d/1cTkGDIIK120GchJXgV06wmFU1X4yNJ2tfQMOrg3SeuE

## What Goes To Drive

- current StudioMate automation status
- target month and work sheet/tab
- operation summaries
- booking result counts
- retry notes
- public-safe handoff notes
- next actions for Codex or another AI

## What Stays In GitHub

- reusable skill content
- generic Playwright scripts
- public-safe site analysis
- automation requirements
- safety and failure rules

## What Stays Local

- `.auth/studiomate.storageState.json`
- cookies and browser profiles
- raw logged-in HTML and screenshots
- customer names/phone lists
- queue JSON files
- run results with customer data
- payment or sales exports

## Work Start Routine

1. Read the AI Hub current status and the StudioMate guide.
2. Check recent operation logs for StudioMate automation.
3. Pull the GitHub skill repo only when code or rule updates are needed.
4. Create or verify the local StudioMate login session.
5. Run read-only extraction before any write action.
6. Use `DRY_RUN=true` first for write-capable workflows.
7. Require `CONFIRM=true` for booking, cancellation, ticket extension, member registration, or other service-impacting clicks.

## Work Finish Routine

1. Update the work sheet execution columns.
2. Save local CSV/JSON run outputs outside GitHub.
3. Write a public-safe summary to Google Drive AI Hub.
4. Commit GitHub changes only when reusable code, skill instructions, or generic rules changed.

## Operation Summary Fields

- date
- author / AI
- work environment
- project
- target month
- source sheet/tab
- scripts used
- execution mode
- counts by status
- failed rows and retry result summary
- changed skill/code links
- next actions
- cautions
