<?php
/** POST /api/login.php - verify credentials and start a session. */

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
$email = trim((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');

$errors = validate_credentials_input('', $email, $password, false);
if ($errors !== []) {
    json_response(['errors' => $errors], 422);
    exit;
}

$pdo = db();
$stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = :email');
$stmt->execute(['email' => mb_strtolower($email)]);
$user = $stmt->fetch();

// Same message whether the email or the password is wrong.
if ($user === false || !password_verify($password, $user['password_hash'])) {
    json_response(['errors' => ['email' => 'These credentials do not match our records.']], 401);
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['user_name'] = $user['name'];

json_response([
    'user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email']],
    'csrf_token' => csrf_token(),
]);
