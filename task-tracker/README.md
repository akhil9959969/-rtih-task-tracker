# Task Tracker - RTIH Internship Technical Assignment

A full-stack Task Tracker web app. A React frontend talks to a core-PHP REST
API over JSON, and the API stores everything in MySQL. Each registered user
sees only their own tasks.

## What it does

- Register, log in, log out (PHP sessions, password hashing)
- Create, list, edit and delete tasks, with a confirmation step before delete
- Task status: Pending, In Progress, Completed - changeable per task
- Search tasks by title, filter by status
- Friendly validation errors on the frontend and the backend
- Dashboard stats (total / in progress / completed), toast messages,
  responsive layout

## Tech stack

- Backend: core PHP 8 (no framework), PDO with prepared statements
- Database: MySQL / MariaDB (`database.sql` at the project root)
- Frontend: React 18 + Vite + Tailwind CSS 4 (prebuilt - the built files are
  `index.html` and `assets/` at the project root, so no Node.js is needed
  just to run the app)

## Requirements

- PHP 8.x with the `pdo_mysql` and `mbstring` extensions (both are enabled
  by default in XAMPP)
- MySQL or MariaDB (XAMPP bundles MariaDB)

## After you download the ZIP: run it on Windows (about 15 minutes)

Everything runs **on your own laptop** - nothing is uploaded anywhere and no
account, API key or internet service is needed. (Internet is used only to
download XAMPP itself and, optionally, for the Google font files.)

You install exactly **one** thing: **XAMPP**. It bundles Apache (web server),
MariaDB (MySQL-compatible database), PHP and phpMyAdmin in one installer. You
do **not** install PHP, MySQL or Node.js separately. VS Code is only a code
editor for reading the files; Jenkins is an automation server for CI/CD -
neither is needed to run this project.

1. **Extract the ZIP.** Right-click the project ZIP, **Extract All...**.
   Inside is one folder: `task-tracker`.
2. **Install XAMPP.** Get it from https://www.apachefriends.org/download and
   install with the defaults.
3. **Copy the project.** Move the extracted `task-tracker` folder into
   `C:\xampp\htdocs\` so the path is `C:\xampp\htdocs\task-tracker\`
   (with `index.html` directly inside it).
4. **Start the servers.** Open the **XAMPP Control Panel** and click
   **Start** next to **Apache** and **MySQL**.
5. **Create the database.** In your browser open
   http://localhost/phpmyadmin, click **Import**, choose `database.sql` from
   the project folder and press **Go**. This creates the `task_tracker`
   database with the `users` and `tasks` tables.
6. **Open the app.** Go to http://localhost/task-tracker/ and register an
   account. Your tasks are stored in MySQL on your laptop.

To stop: close the browser and click **Stop** next to Apache and MySQL. To
run it again later, repeat only steps 4 and 6.

The default DB config (`config/config.php`) matches a fresh XAMPP install
(user `root`, empty password). If your MySQL has a password, copy
`config/config.local.example.php` to `config/config.local.php` and put your
password there. `config.local.php` is ignored by git.

### Rebuilding the frontend (only if you change the React code)

The app in this ZIP is already built; you only need this if you edit the
React source in `src-frontend/`:

```
cd src-frontend
npm install
npm run build
```

Then copy the contents of `src-frontend/dist/` over the deploy folder's
`index.html` and `assets/`. Rebuilding needs Node.js; running the app does
not.

## Database backup and restore

- Backup (command line): `mysqldump -u root task_tracker > backup.sql`
- Restore: `mysql -u root task_tracker < backup.sql`
- phpMyAdmin alternative: select the `task_tracker` database, use the
  **Export** tab (Quick method) to download a `.sql` file, and the **Import**
  tab on any machine to bring it back. This is the same mechanism used to set
  up the project from `database.sql`.

## Project layout

```
task-tracker/                <- deploy-ready folder (copy to htdocs)
  index.html, assets/        <- built React app (built from src-frontend/)
  api/                       <- PHP endpoints (register, login, logout, me, tasks)
  bootstrap.php              <- session + autoload + error handling
  config/                    <- DB config (config.php + optional config.local.php)
  helpers/                   <- JSON responses, validation
  middleware/                <- auth required, CSRF check
  database.sql               <- schema import for phpMyAdmin
  .htaccess                  <- Apache fallback so client routes load
  src-frontend/              <- React source (for reading/review; not needed to run)
  README.md  TESTING.md  COMPLETED_LEVELS.md  SECURITY.md  AI_USAGE.md  LEARN.md
  screenshots/               <- real screenshots of the running app
```

## HTTP API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `api/register.php` | create account, starts a session |
| POST | `api/login.php` | log in (regenerates the session id) |
| POST | `api/logout.php` | log out |
| GET | `api/me.php` | current user + CSRF token |
| GET | `api/tasks.php?search=&status=` | list my tasks, optional search/filter |
| POST | `api/tasks.php` | create a task (CSRF token required) |
| PUT | `api/tasks.php?id=N` | update one of my tasks (CSRF required) |
| DELETE | `api/tasks.php?id=N` | delete one of my tasks (CSRF required) |

All mutations require the `X-CSRF-Token` header from `api/me.php` or the
login/register response. All endpoints answer JSON, including errors.

## Documentation

- `COMPLETED_LEVELS.md` - every requirement of the assignment and where it lives
- `SECURITY.md` - the security measures, one by one
- `TESTING.md` - the automated test results (28 API, 13 browser, 12 mobile checks)
- `AI_USAGE.md` - AI tool usage disclosure
- `LEARN.md` - a guided walkthrough of how the code works
