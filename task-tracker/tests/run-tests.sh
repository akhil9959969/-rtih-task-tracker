#!/bin/bash
# End-to-end API test session for the Task Tracker backend.
# Starts a user-space MySQL 8.0 server and PHP 8.1 built-in server,
# runs curl scenarios, prints PASS/FAIL per case, then stops both.
export LD_LIBRARY_PATH=/tmp/rt/root/lib/x86_64-linux-gnu:/tmp/rt/root/usr/lib/x86_64-linux-gnu
SOCK=/tmp/rt/mysql/run/mysqld.sock
PHP=/tmp/rt/root/usr/bin/php8.1
BASE=http://127.0.0.1:8099
A=/tmp/rt/cookiesA.txt
B=/tmp/rt/cookiesB.txt
PASS=0; FAIL=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "PASS | $1"; PASS=$((PASS+1));
  else echo "FAIL | $1 | expected=$2 got=$3"; FAIL=$((FAIL+1)); fi
}

# --- start servers ---
rm -f $A $B
nohup /tmp/rt/root/usr/sbin/mysqld --no-defaults --basedir=/tmp/rt/root/usr --datadir=/tmp/rt/mysql/data --socket=$SOCK --pid-file=/tmp/rt/mysql/run/mysqld.pid --log-error=/tmp/rt/mysql/log/server.err --mysqlx=OFF --skip-networking --secure-file-priv=/tmp/rt/mysql --user=sandbox > /tmp/rt/mysql/log/out.log 2>&1 &
MYSQLD_PID=$!
for i in $(seq 1 20); do [ -S $SOCK ] && break; sleep 0.5; done
mysql --socket=$SOCK -u root -e "DROP DATABASE IF EXISTS task_tracker;"
mysql --socket=$SOCK -u root < /downloads/rtih-task-tracker/database/database.sql
nohup $PHP -c /tmp/rt/php.ini -S 127.0.0.1:8099 -t /downloads/rtih-task-tracker/backend > /tmp/rt/php-server.log 2>&1 &
PHP_PID=$!
sleep 1.5

# --- 1. logged-out access is refused ---
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/tasks.php)
check "logged-out visitor cannot list tasks (401)" 401 $code

# --- 2. register user A ---
tokA=$(curl -s -c $A $BASE/api/csrf.php | jq -r '.csrf_token')
regA=$(curl -s -b $A -c $A -X POST $BASE/api/register.php -H 'Content-Type: application/json' -H "X-CSRF-Token: $tokA" -d '{"name":"Asha","email":"asha@example.com","password":"secret-pass-1"}')
echo "$regA" | grep -q '"id"' && r=201 || r=err
check "user A registers and gets a session" 201 $r
csrfA=$(echo "$regA" | jq -r '.csrf_token')

# --- 3. session persists ---
me=$(curl -s -b $A $BASE/api/me.php)
echo "$me" | grep -q '"Asha"' && r=yes || r=no
check "GET me.php returns logged-in user A" yes $r

# --- 4. mutation without CSRF token is refused ---
code=$(curl -s -o /dev/null -w '%{http_code}' -b $A -X POST $BASE/api/tasks.php -H 'Content-Type: application/json' -d '{"title":"no token"}')
check "create without CSRF token rejected (403)" 403 $code

# --- 5. valid create ---
t1=$(curl -s -b $A -X POST $BASE/api/tasks.php -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfA" -d '{"title":"Finish Level 1","description":"CRUD working","status":"Pending"}')
echo "$t1" | grep -q '"Finish Level 1"' && r=201 || r=err
check "user A creates a valid task" 201 $r
id1=$(echo "$t1" | jq -r '.task.id')

# --- 6. empty title rejected with friendly error ---
e=$(curl -s -b $A -X POST $BASE/api/tasks.php -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfA" -d '{"title":"","status":"Pending"}')
echo "$e" | grep -q 'Please enter a task title.' && r=yes || r=no
check "empty title rejected with friendly message" yes $r

# --- 7. invalid status rejected ---
e=$(curl -s -b $A -X POST $BASE/api/tasks.php -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfA" -d '{"title":"x","status":"Done"}')
echo "$e" | grep -q 'Please select a valid task status.' && r=yes || r=no
check "invalid status rejected with friendly message" yes $r

# --- 8. list + summary ---
curl -s -b $A -X POST $BASE/api/tasks.php -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfA" -d '{"title":"Write README","status":"In Progress"}' > /dev/null
list=$(curl -s -b $A "$BASE/api/tasks.php")
n=$(echo "$list" | jq '.tasks | length')
check "list returns A's 2 tasks" 2 $n
c=$(echo "$list" | jq -r '.summary["In Progress"]')
check "summary counts In Progress = 1" 1 $c

# --- 9. update title + status ---
u=$(curl -s -b $A -X PUT "$BASE/api/tasks.php?id=$id1" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfA" -d '{"title":"Finish Level 1 (done)","description":"CRUD working","status":"Completed"}')
s=$(echo "$u" | jq -r '.task.status')
check "update changes status to Completed" Completed "$s"

# --- 10. search ---
n=$(curl -s -b $A "$BASE/api/tasks.php?search=README" | jq '.tasks | length')
check "search by title finds README task" 1 $n
n=$(curl -s -b $A "$BASE/api/tasks.php?search=zzz-nothing" | jq '.tasks | length')
check "search with no match returns empty list" 0 $n

# --- 11. filter + search combined ---
n=$(curl -s -b $A "$BASE/api/tasks.php?status=Completed&search=Finish" | jq '.tasks | length')
check "status filter + search combine" 1 $n
code=$(curl -s -o /dev/null -w '%{http_code}' -b $A "$BASE/api/tasks.php?status=Banana")
check "invalid filter value rejected (422)" 422 $code

# --- 12. second user + ownership isolation ---
tokB=$(curl -s -c $B $BASE/api/csrf.php | jq -r '.csrf_token')
regB=$(curl -s -b $B -c $B -X POST $BASE/api/register.php -H 'Content-Type: application/json' -H "X-CSRF-Token: $tokB" -d '{"name":"Bhargav","email":"b@example.com","password":"secret-pass-2"}')
csrfB=$(echo "$regB" | jq -r '.csrf_token')
id2=$(curl -s -b $B -X POST $BASE/api/tasks.php -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfB" -d '{"title":"B task","status":"Pending"}' | jq -r '.task.id')
code=$(curl -s -o /dev/null -w '%{http_code}' -b $B -X PUT "$BASE/api/tasks.php?id=$id1" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfB" -d '{"title":"hijacked","status":"Pending"}')
check "user B cannot update A's task via URL id (404)" 404 $code
code=$(curl -s -o /dev/null -w '%{http_code}' -b $B -X DELETE "$BASE/api/tasks.php?id=$id1" -H "X-CSRF-Token: $csrfB")
check "user B cannot delete A's task via URL id (404)" 404 $code
n=$(curl -s -b $B "$BASE/api/tasks.php" | jq '.tasks | length')
check "user B sees only own tasks (1)" 1 $n

# --- 13. malformed id ---
code=$(curl -s -o /dev/null -w '%{http_code}' -b $A -X PUT "$BASE/api/tasks.php?id=abc" -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfA" -d '{"title":"x","status":"Pending"}')
check "malformed task id rejected (400)" 400 $code

# --- 14. SQL injection probes ---
n=$(curl -s -b $A --get --data-urlencode "search=' OR '1'='1" $BASE/api/tasks.php | jq '.tasks | length')
check "SQLi probe in search returns only real matches (0)" 0 $n
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/login.php -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"x-password-1"}')
check "login without CSRF token refused (403)" 403 $code
C=/tmp/rt/cookiesC.txt; rm -f $C
tokC=$(curl -s -c $C $BASE/api/csrf.php | jq -r '.csrf_token')
code=$(curl -s -o /dev/null -w '%{http_code}' -b $C -X POST $BASE/api/login.php -H 'Content-Type: application/json' -H "X-CSRF-Token: $tokC" -d "{\"email\":\"' OR 1=1 --\",\"password\":\"x-password-1\"}")
check "SQLi probe in login rejected by validation (422)" 422 $code

# --- 15. wrong password, generic message ---
e=$(curl -s -b $C -X POST $BASE/api/login.php -H 'Content-Type: application/json' -H "X-CSRF-Token: $tokC" -d '{"email":"asha@example.com","password":"wrong-password-9"}')
echo "$e" | grep -q 'These credentials do not match our records.' && r=yes || r=no
check "wrong password gives generic error (no user enumeration)" yes $r

# --- 16. delete own task, confirm gone ---
curl -s -b $A -X DELETE "$BASE/api/tasks.php?id=$id1" -H "X-CSRF-Token: $csrfA" > /dev/null
n=$(curl -s -b $A "$BASE/api/tasks.php" | jq '.tasks | length')
check "deleted task stays deleted after re-query (1 left)" 1 $n

# --- 17. logout ends access ---
curl -s -b $A -X POST $BASE/api/logout.php -H "X-CSRF-Token: $csrfA" > /dev/null
code=$(curl -s -o /dev/null -w '%{http_code}' -b $A $BASE/api/tasks.php)
check "after logout, tasks refused (401)" 401 $code

# --- 18. login again, session id regenerated ---
old=$(grep task_tracker_session $A | awk '{print $7}')
tokA=$(curl -s -c $A $BASE/api/csrf.php | jq -r '.csrf_token')
curl -s -b $A -c $A -X POST $BASE/api/login.php -H 'Content-Type: application/json' -H "X-CSRF-Token: $tokA" -d '{"email":"asha@example.com","password":"secret-pass-1"}' > /dev/null
new=$(grep task_tracker_session $A | awk '{print $7}')
[ "$old" != "$new" ] && r=yes || r=no
check "session id regenerated on login" yes $r

# --- 19. password stored hashed, not plaintext ---
h=$(mysql --socket=$SOCK -u root -N -e "SELECT password_hash FROM task_tracker.users WHERE email='asha@example.com';")
case "$h" in '$2y$'*) r=yes;; *) r=no;; esac
check "password stored as password_hash() bcrypt" yes $r

# --- 20. no internals in error responses ---
out=$(curl -s -b $A "$BASE/api/tasks.php?status=%27")
echo "$out" | grep -qiE 'SQLSTATE|PDO|stack trace' && r=yes || r=no
check "error responses hide SQL/server internals" no $r

# --- 21. database failure returns generic JSON, no internals ---
mysql --socket=$SOCK -u root -e "RENAME TABLE task_tracker.tasks TO task_tracker.tasks_hidden;"
out=$(curl -s -b $A $BASE/api/tasks.php)
code=$(curl -s -o /dev/null -w '%{http_code}' -b $A $BASE/api/tasks.php)
mysql --socket=$SOCK -u root -e "RENAME TABLE task_tracker.tasks_hidden TO task_tracker.tasks;"
if [ "$code" = "500" ] && echo "$out" | grep -q 'Something went wrong on the server' && ! echo "$out" | grep -qiE 'SQLSTATE|PDOException|stack trace'; then r=yes; else r=no; fi
check "database failure returns generic JSON 500 without internals" yes $r

echo "===="
echo "PASSED=$PASS FAILED=$FAIL"

# --- stop servers ---
kill $PHP_PID 2>/dev/null
mysql --socket=$SOCK -u root -e "DROP DATABASE IF EXISTS task_tracker;"
mysqladmin --socket=$SOCK -u root shutdown 2>/dev/null
wait $PHP_PID 2>/dev/null
wait $MYSQLD_PID 2>/dev/null
exit 0
