<?php
/**
 * Application configuration.
 *
 * Default values match a fresh XAMPP install (user "root", empty password).
 * To override them without editing this file, copy config.local.example.php
 * to config.local.php in this directory and change the values there.
 * Never commit real credentials to version control.
 */

declare(strict_types=1);

$local = __DIR__ . '/config.local.php';
$overrides = file_exists($local) ? require $local : [];

return array_merge([
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'task_tracker',
        'user'    => 'root',
        'pass'    => '',
        // Unix socket used by some local setups; null = use host/port.
        'socket'  => null,
    ],
    'session' => [
        'name'       => 'task_tracker_session',
        'lifetime_s' => 60 * 60 * 8, // 8 hours
    ],
], $overrides);
