# Testing

Three automated suites were run against the real running app. Results below are
the verbatim outputs of those runs (12 November 2026, IST).

Test environment: PHP 8.1.2 (built-in web server) + MySQL 8.0.46, Google
Chrome (headless) for the browser suite. The app targets XAMPP on Windows
(PHP 8.4 / MariaDB 10.11); the code uses only portable PDO/MySQL features and
standard PHP functions, and `database.sql` is MariaDB-compatible (utf8mb4,
InnoDB). Re-running the checks on XAMPP is covered in `LEARN.md`.

## 1. API end-to-end suite - 28/28 PASS

Each check drives the real HTTP API with `curl`, with a live MySQL database.
Sessions are carried with cookie jars, exactly like a browser would.

```
PASS | logged-out visitor cannot list tasks (401)
PASS | user A registers and gets a session
PASS | GET me.php returns logged-in user A
PASS | create without CSRF token rejected (403)
PASS | user A creates a valid task
PASS | empty title rejected with friendly message
PASS | invalid status rejected with friendly message
PASS | list returns A's 2 tasks
PASS | summary counts In Progress = 1
PASS | update changes status to Completed
PASS | search by title finds README task
PASS | search with no match returns empty list
PASS | status filter + search combine
PASS | invalid filter value rejected (422)
PASS | user B cannot update A's task via URL id (404)
PASS | user B cannot delete A's task via URL id (404)
PASS | user B sees only own tasks (1)
PASS | malformed task id rejected (400)
PASS | SQLi probe in search returns only real matches (0)
PASS | login without CSRF token refused (403)
PASS | SQLi probe in login rejected by validation (422)
PASS | wrong password gives generic error (no user enumeration)
PASS | deleted task stays deleted after re-query (1 left)
PASS | after logout, tasks refused (401)
PASS | session id regenerated on login
PASS | password stored as password_hash() bcrypt
PASS | error responses hide SQL/server internals
PASS | database failure returns generic JSON 500 without internals
====
PASSED=28 FAILED=0
```

## 2. Browser end-to-end suite - 13/13 PASS

A headless Chrome drives the built frontend (the real `dist` bundle) served
by the PHP backend with the live database. It clicks, types and asserts what
a user would see.

```
PASS | logged-out visitor is redirected to login
PASS | register logs in and lands on dashboard
PASS | empty state shows for new account
PASS | task created through dialog appears in list
PASS | empty title blocked with friendly message in dialog
PASS | stat card shows total of 3
PASS | search filters the list to matching titles
PASS | row action buttons render | count=3
PASS | edit replaced text cleanly (no concatenation)
PASS | delete removes task after confirmation
PASS | logout returns to login page
PASS | tasks persist across logout/login (MySQL)
PASS | mobile dashboard renders
====
PASSED=13 FAILED=0
```

The exact scripts used for these three suites are included in `tests/`
(see `tests/README.md` for how they were run and how to reproduce the
checks manually on XAMPP).

Screenshots taken during this run are in `screenshots/`.

## Mobile responsive checks (mobile-final.mjs, Chrome headless)

Run against the same deployed build on PHP 8.1.2 + MySQL 8.0.46. Viewports
320, 360, 390 and 768 px were measured for horizontal overflow
(scrollWidth vs clientWidth) and the main mobile flows were exercised.

```
PASS | no horizontal overflow at 320px | scroll=320 client=320
PASS | no horizontal overflow at 360px | scroll=360 client=360
PASS | no horizontal overflow at 390px | scroll=390 client=390
PASS | no horizontal overflow at 768px | scroll=768 client=768
PASS | hamburger opens nav drawer
PASS | add task works on mobile
PASS | mobile row shows status badge
PASS | mobile row shows date
PASS | row fits viewport | w=340
PASS | row action menu opens on mobile
PASS | edit dialog opens on mobile
PASS | theme switches to dark via visible control
====
PASSED=12 FAILED=0
```

## Full interactive audit

Beyond the three suites above, a separate click-through audit drove a real
browser (headless Chrome) through every visible control with viewport
assertions - overlays must render on screen, not just exist in the DOM:
25/25 desktop checks (register validation, empty state, dialogs, create,
toggle, status filter, search, row menu, edit persistence across reload,
delete cancel + confirm), 13/13 shell checks (section navigation feedback,
sidebar collapse, theme switch + persistence, logout redirect, wrong-password
error, second-account data isolation), 10/10 mobile checks (390px and 320px
layouts, drawer navigation, dialogs and row menu in viewport, delete,
logout).

## Bugs found and fixed during testing

1. Task id validation used `ctype_digit`, which behaves differently across
   PHP setups; replaced with a `preg_match` check so ids validate the same
   way everywhere.
2. The status filter dropdown went blank when "All statuses" was chosen:
   the select component rejects an empty-string value, so an explicit `all`
   sentinel value is used and mapped back to "no filter" in code.
3. On phone-width screens the task list forced horizontal scrolling: a flex
   container kept its content's minimum width (`min-width: auto`). Setting
   `min-w-0` on the shell column let it shrink; rows were then restructured
   so title, status badge and date all stay visible down to 320 px.
4. The decorative card stack on the login page lost its depth because a
   float animation overrode the 3D `translateZ` position of the back cards;
   the animation now composes with the transform instead of replacing it.
5. The row action menu (Edit/Delete) never appeared on screen: the shared
   `Button` component did not forward refs, which the menu trigger
   (`DropdownMenu.Trigger asChild`) needs to measure the button's position.
   The menu opened in the page but rendered off-screen, so it looked dead.
   `Button` now forwards its ref, and the menu opens next to the button
   (verified by position measurement and screenshots). This one was found
   during the first Windows XAMPP run, which is exactly why that run matters.

6. The sidebar links (Overview / My Tasks / Settings) looked dead: they are
   same-page anchors, and when the whole dashboard fits on screen there is
   nothing to scroll, so a click changed nothing visibly. They now
   smooth-scroll to their section and briefly highlight it, so every click
   gives visible feedback. Also found during the first Windows XAMPP run.
7. The two theme pickers (sidebar and Settings card) could show different
   selections at the same time: each kept its own copy of the current theme.
   They now watch the shared data-theme attribute, so every instance shows
   the same choice.
8. The sidebar's active-section highlight was fixed on Overview no matter
   which link was clicked. It now follows the clicked section (and is
   exposed as aria-current). The automated menu checks now also assert that the menu renders inside the viewport, not only that it exists in the page.

## Windows XAMPP verification

The results above were produced on Linux (PHP 8.1.2 + MySQL 8.0.46). The rows
below record the owner's verification on his own Windows XAMPP install; each
row was dated only after he actually performed it on his machine.

| Check (on his XAMPP) | Expected | Result |
| --- | --- | --- |
| Apache and MySQL start in the XAMPP panel | both green | PASS (12 Nov 2026) |
| Import `database.sql` in phpMyAdmin | `task_tracker` with `users` + `tasks` tables | PASS (12 Nov 2026) |
| Open http://localhost/task-tracker/ | register/login screen loads | PASS (12 Nov 2026) |
| Register an account | lands on empty dashboard | PASS (12 Nov 2026) |
| Add a task | appears in the list, saved | PASS (12 Nov 2026) |
| Edit a task via the "..." menu | new title shows, stays after refresh | PASS (12 Nov 2026) |
| Change status via the status circle | Completed, stays after refresh | PASS (12 Nov 2026) |
| Delete a task via the "..." menu | removed, stays gone after refresh | PASS (12 Nov 2026) |
| Search | only matching tasks listed | PASS (12 Nov 2026) |
| Status filter | list updates to the selected status | PASS (12 Nov 2026) |
| Logout, then open the app URL directly | redirected to login | PASS (12 Nov 2026) |
| Second account cannot see first account's tasks | only own tasks | PASS (12 Nov 2026) |
| Open on a phone-width browser window | no horizontal scroll, badges/dates visible | PASS (12 Nov 2026) |

Edit, status change, delete and the status filter were re-verified on the
final package build on the evening of 12 Nov. Add and search were verified
earlier the same day on the previous build; the add-task and search code did
not change between those builds (the final build only changed the row action
menu button, sidebar navigation feedback, theme picker sync, the active
sidebar highlight and the favicon). The logged-out redirect and two-account isolation
checks were run manually by the owner on 12 Nov: a task created in account A
was not visible in account B's dashboard and was still present back in A. The
phone-width check was done at 400 px in Chrome's responsive mode on Windows
(header, stats, search, filter, task title, status, date and menu button all
fit with no horizontal scroll); a native phone was not tested.

## How to spot-check on XAMPP

1. Register two accounts in two browsers (or normal + private window).
2. Create tasks in account A; confirm account B cannot see them.
3. Copy the URL id of one of A's tasks and try to open/edit it as B - the
   app answers 404, not someone else's data.
4. Try creating a task with an empty title: the dialog shows
   "Please enter a task title." and nothing is sent.
5. Add `'); DROP TABLE tasks; --` as a search term: nothing breaks, because
   all queries use prepared statements.
