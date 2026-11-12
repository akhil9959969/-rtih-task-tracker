<?php
/**
 * CSRF protection for the session-cookie API.
 *
 * GET /api/me.php (and login/register responses) return a per-session token.
 * Every state-changing request must repeat it in the X-CSRF-Token header.
 * Because the header cannot be attached by a cross-site form, and the token
 * is tied to the session, forged cross-site requests are rejected.
 */

declare(strict_types=1);

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_require(): void
{
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $token = $_SESSION['csrf_token'] ?? '';
    if ($token === '' || !is_string($header) || !hash_equals($token, $header)) {
        json_response(['error' => 'Your session changed. Please refresh the page and try again.'], 403);
        exit;
    }
}
