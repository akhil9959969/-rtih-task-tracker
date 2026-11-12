# Security notes

What the app does to protect users, and where each measure lives. Every item
is exercised by the suites in `TESTING.md`.

## Passwords

- Passwords are hashed with PHP `password_hash()` (bcrypt) at registration
  and verified with `password_verify()` at login (`api/register.php`,
  `api/login.php`). The plain password is never stored or returned.
- Verified in tests: the value in `users.password_hash` is a `$2y$` bcrypt
  hash, not the submitted password.

## Sessions

- PHP sessions with an HttpOnly session cookie, so JavaScript cannot read it
  (set in `bootstrap.php` before `session_start()`).
- `session_regenerate_id(true)` on login, which kills session fixation.
- Logout destroys the session server-side; afterwards every API call answers
  401 (verified).

## SQL injection

- All queries use PDO prepared statements with bound parameters
  (`config/database.php` creates the connection, `api/tasks.php` uses it).
  No user input is ever concatenated into SQL.
- Verified with SQLi probes in search and login (they match nothing / are
  rejected by validation, and the tables survive).

## Cross-site scripting (XSS)

- React escapes all rendered text by default; the app never uses
  `dangerouslySetInnerHTML`. Task titles like `<script>alert(1)</script>`
  display as text.
- JSON is served with `Content-Type: application/json` and
  `X-Content-Type-Options: nosniff`.

## Cross-site request forgery (CSRF)

- `GET api/csrf.php` issues a per-session random token before login; the
  frontend fetches it first and repeats it in the `X-CSRF-Token` header.
  Login and registration themselves require a valid token (pre-authentication
  CSRF protection, as recommended by the OWASP login cheat sheet), and so
  does every later state-changing request (POST/PUT/DELETE).
  `middleware/csrf.php` compares with `hash_equals()` and answers 403 on
  mismatch; the session id is regenerated at login.
- Because the token is tied to the session and never appears in a URL, a
  malicious site cannot forge a valid mutation.
- Verified: a login attempt without the token and a create call without the
  token are both rejected with 403.

## Authorization (ownership)

- Rule: a user can read and change only their own tasks.
- Every task query includes `user_id = <logged-in user>` in the WHERE clause,
  including single-task updates and deletes. A request carrying someone
  else's task id returns 404 - the same answer as "does not exist", so ids
  cannot be probed.
- This is enforced by the backend, not by hiding buttons in the UI.
- Verified: user B cannot update or delete user A's task even with the exact
  URL and id.

## Input validation

- Server-side validation in `helpers/validation.php`: title required (max
  200 chars), description optional, status must be one of the three allowed
  values, ids must be positive integers.
- Errors come back as friendly JSON (`422` with per-field messages); the
  frontend shows the same messages inline.

## Error handling

- `bootstrap.php` sets `display_errors` off, converts PHP warnings/notices
  into exceptions, and registers a global exception handler that logs the
  real error server-side and answers a generic JSON 500 ("Something went
  wrong on the server.").
- Verified by test: with the `tasks` table deliberately hidden, the API
  answers 500 with that generic message - no SQL text, credentials, paths or
  stack traces in the response.

## What is intentionally not included

- No credentials, API keys or secrets in the repo or the ZIP. The DB password
  lives only in `config/config.local.php` on your own machine, and that file
  is git-ignored; only the example file is shipped.
- No rate limiting on login attempts - fine for a local assignment, but worth
  mentioning in the review as the next hardening step.
