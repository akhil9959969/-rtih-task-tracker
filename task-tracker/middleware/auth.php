<?php
/**
 * Authentication and authorization helpers.
 * require_auth() guards every protected endpoint; ownership checks use the
 * session user id only - never an id supplied by the client.
 */

declare(strict_types=1);

function current_user_id(): ?int
{
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

function require_auth(): int
{
    $userId = current_user_id();
    if ($userId === null) {
        json_response(['error' => 'Please log in to continue.'], 401);
        exit;
    }
    return $userId;
}

/**
 * Fetch one task owned by the given user, or end the request.
 * This is the authorization rule of the app: the WHERE clause always
 * includes user_id, so a manipulated URL id can never reach another
 * user's row - it simply looks like the task does not exist.
 */
function require_owned_task(PDO $pdo, int $userId, int $taskId): array
{
    $stmt = $pdo->prepare('SELECT id, user_id, title, description, status, created_at
                           FROM tasks WHERE id = :id AND user_id = :uid');
    $stmt->execute(['id' => $taskId, 'uid' => $userId]);
    $task = $stmt->fetch();
    if ($task === false) {
        json_response(['error' => 'Task not found.'], 404);
        exit;
    }
    return $task;
}
