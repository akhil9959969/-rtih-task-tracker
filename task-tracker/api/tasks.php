<?php
/**
 * Task collection endpoint.
 *   GET    /api/tasks.php?search=...&status=...  list own tasks
 *   POST   /api/tasks.php                        create a task
 *   PUT    /api/tasks.php?id=123                 update a task (owner only)
 *   DELETE /api/tasks.php?id=123                 delete a task (owner only)
 *
 * Every query is scoped to the session user's id: ownership is enforced
 * by the database, not by hiding buttons in the interface.
 */

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$userId = require_auth();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Optional search (title substring) and status filter; they combine.
        $search = trim((string) ($_GET['search'] ?? ''));
        $status = (string) ($_GET['status'] ?? '');

        $where = ['user_id = :uid'];
        $params = ['uid' => $userId];

        if ($status !== '') {
            if (!in_array($status, TASK_STATUSES, true)) {
                json_response(['error' => 'Please select a valid task status.'], 422);
                exit;
            }
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        if ($search !== '') {
            // Prepared statements stop SQL injection, but % and _ are still
            // LIKE wildcards - escape them so search stays literal.
            $where[] = "title LIKE :search ESCAPE '\\\\'";
            $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search);
            $params['search'] = '%' . $escaped . '%';
        }

        $sql = 'SELECT id, title, description, status, created_at
                FROM tasks WHERE ' . implode(' AND ', $where) . '
                ORDER BY created_at DESC, id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Summary counts for the dashboard, always for this user only.
        $counts = $pdo->prepare('SELECT status, COUNT(*) AS n FROM tasks WHERE user_id = :uid GROUP BY status');
        $counts->execute(['uid' => $userId]);
        $summary = ['Pending' => 0, 'In Progress' => 0, 'Completed' => 0];
        foreach ($counts->fetchAll() as $row) {
            $summary[$row['status']] = (int) $row['n'];
        }

        json_response(['tasks' => $stmt->fetchAll(), 'summary' => $summary]);
        break;

    case 'POST':
        csrf_require();
        $body = json_body();
        $title = trim((string) ($body['title'] ?? ''));
        $description = trim((string) ($body['description'] ?? ''));
        $status = (string) ($body['status'] ?? 'Pending');

        $errors = validate_task_input($title, $status);
        if ($errors !== []) {
            json_response(['errors' => $errors], 422);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO tasks (user_id, title, description, status)
                               VALUES (:uid, :title, :description, :status)');
        $stmt->execute([
            'uid' => $userId,
            'title' => $title,
            'description' => $description === '' ? null : $description,
            'status' => $status,
        ]);

        $id = (int) $pdo->lastInsertId();
        json_response(['task' => require_owned_task($pdo, $userId, $id)], 201);
        break;

    case 'PUT':
        csrf_require();
        $taskId = parse_task_id($_GET['id'] ?? null);
        if ($taskId === null) {
            json_response(['error' => 'Invalid task id.'], 400);
            exit;
        }
        // 404 (not 403) for other users' tasks: do not reveal they exist.
        require_owned_task($pdo, $userId, $taskId);

        $body = json_body();
        $title = trim((string) ($body['title'] ?? ''));
        $description = trim((string) ($body['description'] ?? ''));
        $status = (string) ($body['status'] ?? '');

        $errors = validate_task_input($title, $status);
        if ($errors !== []) {
            json_response(['errors' => $errors], 422);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE tasks SET title = :title, description = :description, status = :status
                               WHERE id = :id AND user_id = :uid');
        $stmt->execute([
            'title' => $title,
            'description' => $description === '' ? null : $description,
            'status' => $status,
            'id' => $taskId,
            'uid' => $userId,
        ]);

        json_response(['task' => require_owned_task($pdo, $userId, $taskId)]);
        break;

    case 'DELETE':
        csrf_require();
        $taskId = parse_task_id($_GET['id'] ?? null);
        if ($taskId === null) {
            json_response(['error' => 'Invalid task id.'], 400);
            exit;
        }
        require_owned_task($pdo, $userId, $taskId);

        $stmt = $pdo->prepare('DELETE FROM tasks WHERE id = :id AND user_id = :uid');
        $stmt->execute(['id' => $taskId, 'uid' => $userId]);

        json_response(['ok' => true]);
        break;

    default:
        json_response(['error' => 'Method not allowed.'], 405);
}
