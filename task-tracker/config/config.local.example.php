<?php
/**
 * Copy this file to config.local.php and adjust for your machine.
 * config.local.php is in .gitignore so real credentials never ship.
 */
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'task_tracker',
        'user' => 'root',
        'pass' => '',          // XAMPP default; change if you set one
        'socket' => null,
    ],
];
