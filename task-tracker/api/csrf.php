<?php
/**
 * GET /api/csrf.php - issue the per-session CSRF token before login/register.
 *
 * The session cookie is set by bootstrap.php on first request; the token is
 * stored in that session. Login, registration and every later state-changing
 * request must repeat it in the X-CSRF-Token header, which a cross-site form
 * cannot attach - so forged requests are rejected even before authentication.
 */

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['error' => 'Method not allowed.'], 405);
    exit;
}

json_response(['csrf_token' => csrf_token()]);
