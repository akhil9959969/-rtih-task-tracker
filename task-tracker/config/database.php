<?php
/**
 * PDO connection factory. One connection per request, exceptions on,
 * prepared statements emulated off (real server-side prepares).
 */

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $db = $config['db'];

    if (!empty($db['socket'])) {
        $dsn = "mysql:unix_socket={$db['socket']};dbname={$db['name']};charset=utf8mb4";
    } else {
        $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4";
    }

    try {
        $pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // Never expose credentials, DSN or server internals to the client.
        error_log('Database connection failed: ' . $e->getMessage());
        json_response(['error' => 'The service is temporarily unavailable. Please try again.'], 503);
        exit;
    }

    return $pdo;
}
