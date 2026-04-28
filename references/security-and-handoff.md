# Security And Handoff

## Do Not Commit

Never put these in GitHub or shared artifacts:

- `.auth/`
- `storageState.json`
- browser cookies or local browser profiles
- `debug/` screenshots, HTML, or raw text dumps
- live booking queues with customer names and phone numbers
- Google Sheet exports containing customer data
- run-result files containing customer data
- payment or ticket detail exports

## Storage Separation

Use three storage layers:

1. Google Drive AI Hub
   - active work state
   - operation logs
   - handoff notes
   - current decisions and next actions
   - public-safe summaries for external AI
2. GitHub private repo
   - skill instructions
   - generic scripts
   - selector references
   - sanitized examples
   - public-safe troubleshooting notes
3. Local workspace only
   - StudioMate login session and storage state
   - raw Google Sheet exports
   - customer queues
   - screenshots, HTML, debug text
   - live run results and payment/sales exports

AI Hub guide:

- `StudioMate 자동화 운영 기준 - AI 허브`
- https://docs.google.com/document/d/1cTkGDIIK120GchJXgV06wmFU1X4yNJ2tfQMOrg3SeuE

## Recommended GitHub Storage

Store only:

- skill instructions
- generic scripts
- selector references
- sanitized examples
- public-safe troubleshooting notes

Use a private repository unless the user explicitly wants public.
Do not use GitHub as the operation log or active work handoff hub.

## Cross-Computer Workflow

On each computer:

1. Clone the skill repository.
2. Copy or symlink it into the local Codex skills folder if needed.
3. Create a local StudioMate Playwright login state on that computer.
4. Keep real sheet URLs and working queues in the local workspace, not in the skill repo.
5. Use Google Drive AI Hub for active handoff:
   - current target month
   - sheet link
   - what has been booked
   - what is excluded
   - remaining `확인필요`
   - local files that contain sensitive data, without copying their contents

## Git Hygiene

Before committing:

1. Run `find . -maxdepth 3 -type f`.
2. Run `git status --short`.
3. Confirm `.gitignore` excludes sensitive paths.
4. Search for common sensitive patterns:
   - phone-number-like strings
   - `storageState`
   - `.auth`
   - raw Google Sheet IDs if the repo should be reusable

## Operation Log Template

After work, leave this summary in Google Drive AI Hub or the operations log sheet:

- date
- author / AI
- work environment
- project: StudioMate automation
- target month
- Google Sheet and tab
- scripts used
- mode: dry-run / confirmed live action
- counts: 완료 / 중복 / 제외 / 확인필요
- retry results
- GitHub skill/code changes, if any
- next action
- cautions
