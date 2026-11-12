<?php
/**
 * Shared bootstrap for every endpoint: config, secure session, helpers.
 */

declare(strict_types=1);

require __DIR__ . '/helpers/response.php';
require __DIR__ . '/helpers/validation.php';
require __DIR__ . '/config/database.php';
require __DIR__ . '/middleware/csrf.php';
require __DIR__ . '/middleware/auth.php';

// Never leak internals to the client: display_errors off, PHP warnings and
// notices become exceptions, and every uncaught exception is logged and
// answered with a generic JSON 500 - no SQL text, paths or stack traces.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function (Throwable $e): void {
    error_log((string) $e);
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
    }
    echo json_encode(['error' => 'Something went wrong on the server. Please try again.']);
    exit;
});

$config = require __DIR__ . '/config/config.php';

session_name($config['session']['name']);
session_set_cookie_params([
    'lifetime' => $config['session']['lifetime_s'],
    'path'     => '/',
    'httponly' => true,            // JavaScript cannot read the cookie
    'samesite' => 'Lax',           // basic cross-site request defense
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
]);
session_start();

// Defensive headers for all API responses.
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
