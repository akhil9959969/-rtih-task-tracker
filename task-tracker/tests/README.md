# Test scripts (as run during development)

These are the exact scripts behind the results in `../TESTING.md`:

- `run-tests.sh` - 28 API checks with curl against the live PHP + MySQL stack
- `ui-test.mjs` - 13 browser end-to-end checks (Puppeteer, headless Chrome)
- `mobile-final.mjs` - 12 mobile/responsive checks at 320/360/390/768 px
- `audit-auth-crud.mjs` - 25-check click-through audit: auth validation, dialogs, CRUD, filters, search (viewport-asserted)
- `audit-shell.mjs` - 13-check audit: section nav feedback, sidebar, themes, logout, wrong password, account isolation
- `audit-mobile.mjs` - 10-check audit: 390/320 px layouts, drawer, dialogs, row menu, delete, logout

## Honest reproducibility note

They were run on Linux with PHP 8.1.2 and MySQL 8.0.46, and they reference
that environment's paths (for example `/tmp/rt/...`), so they will NOT run
unchanged on Windows. They are included as evidence of what was executed and
as a readable specification of each check - not as a one-click Windows test
runner.

To reproduce the same coverage on XAMPP, follow the manual spot-check list in
`../TESTING.md` ("How to spot-check on XAMPP") plus a browser walk of
register, add/edit/delete a task, search, filter, and logout.
