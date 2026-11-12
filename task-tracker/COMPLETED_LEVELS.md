# Completed levels

Status against the official assignment ("Technical Assignment - Intern - IT").
All three levels are complete. The bonus dashboard summary is also done.

## Level 1 - Basic Task Management: COMPLETE

| Requirement | Where |
| --- | --- |
| MySQL database and `tasks` table | `database.sql` (`tasks` + `users`, InnoDB, utf8mb4) |
| Add a task with title and description | `api/tasks.php` (POST) + New task dialog |
| Display all saved tasks | `api/tasks.php` (GET) + task list on the dashboard |
| Edit a task's title and description | `api/tasks.php` (PUT) + Edit dialog |
| Delete after asking the user to confirm | `api/tasks.php` (DELETE) + "Delete this task?" dialog |
| Useful message on add/update/delete | Toast messages ("Task added.", "Task updated.", "Task deleted.") |
| Fields: id, title, description, status, created_at | `database.sql` (`tasks` table) |

## Level 2 - Status, Search and Validation: COMPLETE

| Requirement | Where |
| --- | --- |
| Statuses: Pending, In Progress, Completed | `ENUM('Pending','In Progress','Completed')` in `database.sql`, validated again in `helpers/validation.php` |
| Change a task's status | Edit dialog status select + one-click complete toggle on each row |
| Search field by title | `api/tasks.php?search=...` (prepared LIKE) + search box |
| Status filter | `api/tasks.php?status=...` + filter dropdown |
| Validate required fields on frontend and backend | `TaskFormDialog.jsx` (client) and `helpers/validation.php` (server) |
| Friendly validation errors | Inline field errors and JSON `{error, errors}` responses with 422 |

## Level 3 - Login, Authorization and Basic Security: COMPLETE

| Requirement | Where |
| --- | --- |
| Registration / login flow | `api/register.php`, `api/login.php`, `api/logout.php`, `api/me.php` |
| `password_hash()` / `password_verify()` | `api/register.php` (bcrypt), `api/login.php` |
| Only logged-in users reach the dashboard | `middleware/auth.php` (401) + the frontend redirects to /login |
| Users access only what they are permitted to | Every task query is scoped `WHERE user_id = :me`; others' ids answer 404 |
| No viewing/modifying another user's tasks via URL tampering | Ownership is part of the SQL, not just the UI (verified by tests) |
| Authorization enforced by the backend | `middleware/auth.php` + ownership in every query |
| Prepared statements for all user input | PDO prepared statements everywhere (`config/database.php`, `api/tasks.php`) |
| Escape output before displaying | React escapes all rendered text by default; no `dangerouslySetInnerHTML` is used |
| CSRF token on state-changing forms | Per-session token from `api/me.php`, required as `X-CSRF-Token` on POST/PUT/DELETE, checked in `middleware/csrf.php` |

### Roles and permissions (the rule the assignment asks me to explain)

There is one role: a registered user. The permission rule is ownership -
a user can read and change only their own tasks. The backend enforces it in
two layers: the session proves who you are (`middleware/auth.php`), and every
SQL statement carries `user_id = <the logged-in user's id>`, so even a
hand-crafted request with someone else's task id returns 404 as if the task
did not exist.

## Database design (section 4)

Two tables. `users(id, name, email UNIQUE, password_hash, created_at)` and
`tasks(id, user_id FK -> users.id ON DELETE CASCADE, title, description,
status ENUM('Pending','In Progress','Completed'), created_at)` with separate
indexes on `tasks(user_id)` and `tasks(status)` - matching `database.sql`
exactly. utf8mb4 throughout so names and descriptions can hold any language.

## Testing checklist (section 8)

| Check | Result |
| --- | --- |
| Add a task with valid information | PASS (browser + API suites) |
| Empty task title rejected | PASS (client and server, friendly message) |
| Edit, update status and delete a task | PASS |
| Search and status filters return expected tasks | PASS |
| Logged-out visitor reaches the dashboard? | No - API answers 401, app redirects to /login |
| Passwords stored as hashes | PASS - bcrypt via `password_hash()` (verified in DB) |
| Access/modify another user's tasks? | No - 404 on cross-user URL tampering (tested) |
| Prepared statements | Yes - all queries (SQLi probes tested) |
| Invalid input handled without leaking credentials or server errors | PASS - JSON errors, no internals (tested) |

Full outputs in `TESTING.md`.

## Bonus (section 9)

- Dashboard summary (total / in progress / completed): DONE.
- Pagination: not implemented (fine for the expected task counts).
- Due dates / priority: not implemented.

## Known limitations

- No pagination yet (optional bonus).
- Email addresses are not verified (no mail sending), so any syntactically
  valid unique email can register.
- Developed and tested on PHP 8.1 + MySQL 8.0; the target XAMPP stack is
  PHP 8.4 + MariaDB 10.11. Only standard, portable features are used and the
  spot-check list in `TESTING.md` covers re-verification on XAMPP.
