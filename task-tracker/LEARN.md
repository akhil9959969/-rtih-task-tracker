# LEARN.md - understand your project before the review

Read this once, then make one small change yourself (see the last section).
The review will ask you to explain the code - this guide is the map.

## 1. The big picture (30 seconds)

```
Browser (React app)  --JSON over HTTP-->  PHP API  --SQL-->  MySQL
     index.html + assets/                  api/*.php          task_tracker DB
```

- The React app never talks to MySQL. It calls the PHP API with `fetch()`.
- The PHP API never returns HTML. It returns JSON.
- MySQL stores two tables: `users` and `tasks`.

## 2. What happens when you log in (follow the code)

1. You submit the form in `src-frontend/src/pages/AuthPages.jsx`.
2. `src-frontend/src/lib/api.js` sends `POST /task-tracker/api/login.php`
   with the email and password as JSON.
3. `api/login.php` finds the user by email and checks the password with
   `password_verify()` against the stored bcrypt hash.
4. On success it calls `session_regenerate_id(true)` (kills session fixation)
   and stores your user id in `$_SESSION`. The session id travels in an
   HttpOnly cookie that JavaScript cannot read.
5. From now on, `middleware/auth.php` recognizes you on every request.

## 3. The files that matter most

| File | What it does |
| --- | --- |
| `bootstrap.php` | Starts the secure session (HttpOnly, SameSite=Lax), loads helpers, sets defensive headers |
| `config/config.php` | DB name/host/user and session settings. Secrets go in `config.local.php` (not shipped) |
| `config/database.php` | Creates the PDO connection with exceptions on and real prepares (`ATTR_EMULATE_PREPARES => false`) |
| `middleware/auth.php` | `auth_require()` answers 401 when nobody is logged in |
| `middleware/csrf.php` | Per-session token; mutations without it get 403 |
| `helpers/validation.php` | Server-side rules: title required, status must be one of three, ids positive integers |
| `api/tasks.php` | The CRUD core: GET list (with search/filter), POST create, PUT update, DELETE |
| `database.sql` | The schema you import in phpMyAdmin |

## 4. The one security idea to be able to explain: ownership

Every SQL statement in `api/tasks.php` carries `user_id = :me`, where `:me`
is the id from the session - never from the URL or the request body. So even
if someone guesses another user's task id and calls
`PUT api/tasks.php?id=123`, the query matches nothing and the API answers
404. The rule is enforced by the backend; hiding buttons in the UI alone
would not be security.

Say it in one line in the review: "Ownership is part of the SQL WHERE clause,
not just the interface."

## 5. CSRF in one minute

The session cookie is sent automatically by the browser - even from a
malicious page on another site. To stop that page from forging requests,
every mutation must also send the `X-CSRF-Token` header, a random per-session
value the frontend reads from `api/me.php`. Another site cannot know that
token, so its forged requests fail with 403.

## 6. How the frontend is organized

- `src/main.jsx` mounts React; `src/App.jsx` sets up routes and providers.
- `src/context/AuthContext.jsx` knows who is logged in (calls `api/me.php`).
- `src/pages/DashboardPage.jsx` is the main screen: stats, search, filter, list.
- `src/components/` holds the pieces (task list, dialogs, toasts).
- `src/components/ui/` holds the design system (button, input, dialog...),
  hand-written on Radix UI primitives with Tailwind classes.
- `src/index.css` holds the design tokens (colors, fonts) as CSS variables;
  three themes live there (`ivory`, `dark`, `sage`).

## 7. Run it yourself (10 minutes)

1. XAMPP Control Panel: start Apache and MySQL.
2. Copy the `task-tracker` folder into `C:\xampp\htdocs\`.
3. phpMyAdmin -> Import -> `database.sql` -> Go.
4. http://localhost/task-tracker/ -> register -> add a task.

## 8. Spot-check the security claims yourself

1. Register a second account in a private window. Create tasks in both.
   Each account sees only its own.
2. Log out, then open http://localhost/task-tracker/api/tasks.php directly:
   you get `{"error":...}` with HTTP 401.
3. Search for `'); DROP TABLE tasks; --` - nothing happens (prepared statements).
4. In phpMyAdmin, look at `users.password_hash`: it starts with `$2y$`, it is
   not your password.

## 9. Make one change of your own (required for AI_USAGE.md)

Pick one, do it, see it work, then write it into `AI_USAGE.md`:

- Change the accent color: edit `--accent` in `src-frontend/src/index.css`,
  rebuild (`npm run build`) and copy `dist` over the deploy folder.
- Change a validation message: edit the already-registered email text in
  `api/register.php`, reload the app and try to register again with the
  same email - your message appears under the Email field. No build
  needed. (Task-title messages would not work for this: the dialog checks
  an empty title itself and never sends the request, and the title field
  stops typing at 200 characters, so the server never sees a longer one.
  Only the backend can know an email is already taken, so this message
  really does come from the server.)
- Change the minimum password length in `api/register.php` and
  `src-frontend/src/pages/AuthPages.jsx` (both places - why both?).

## 10. Likely review questions and honest answers

- "Why two tables?" - Users own tasks; a foreign key keeps that rule in the
  database itself (`ON DELETE CASCADE` removes a user's tasks with the user).
- "Why PDO prepared statements?" - User input is data, never SQL text, so
  injection cannot happen.
- "Why bcrypt?" - It is slow on purpose and salted automatically; leaked
  hashes are expensive to crack.
- "Why React?" - The assignment allows any frontend; React keeps the UI
  state predictable and talks to the PHP API with JSON.
- "What would you add next?" - Pagination, login rate limiting, email
  verification (all listed as limitations in COMPLETED_LEVELS.md).
