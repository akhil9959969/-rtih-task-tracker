<?php
/** POST /api/register.php - create an account and start a session. */

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed.'], 405);
    exit;
}

// Pre-authentication CSRF check: the client must first fetch the token from
// GET /api/csrf.php (same session) and repeat it in X-CSRF-Token.
csrf_require();

$body = json_body();
$name = trim((string) ($body['name'] ?? ''));
$email = trim((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');

$errors = validate_credentials_input($name, $email, $password, true);
if ($errors !== []) {
    json_response(['errors' => $errors], 422);
    exit;
}

$pdo = db();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
$stmt->execute(['email' => mb_strtolower($email)]);
if ($stmt->fetch() !== false) {
    json_response(['errors' => ['email' => 'Ee Email tho account already undi,login avu.']], 409);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash)');
$stmt->execute(['name' => $name, 'email' => mb_strtolower($email), 'hash' => $hash]);

// Regenerate the session id at the moment privilege changes.
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $pdo->lastInsertId();
$_SESSION['user_name'] = $name;

json_response([
    'user' => ['id' => $_SESSION['user_id'], 'name' => $name, 'email' => mb_strtolower($email)],
    'csrf_token' => csrf_token(),
], 201);
