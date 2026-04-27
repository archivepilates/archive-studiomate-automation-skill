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

## Recommended GitHub Storage

Store only:

- skill instructions
- generic scripts
- selector references
- sanitized examples
- public-safe troubleshooting notes

Use a private repository unless the user explicitly wants public.

## Cross-Computer Workflow

On each computer:

1. Clone the skill repository.
2. Copy or symlink it into the local Codex skills folder if needed.
3. Create a local StudioMate Playwright login state on that computer.
4. Keep real sheet URLs and working queues in the local workspace, not in the skill repo.
5. Use a handoff note for active work:
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
