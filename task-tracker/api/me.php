<?php
/** GET /api/me.php - current session state plus a fresh CSRF token. */

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$userId = current_user_id();
if ($userId === null) {
    json_response(['user' => null], 200);
    exit;
}

json_response([
    'user' => ['id' => $userId, 'name' => $_SESSION['user_name'] ?? ''],
    'csrf_token' => csrf_token(),
]);
