<?php
/**
 * Login endpoint — POST username, password
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = isset($input['username']) ? trim((string) $input['username']) : '';
$password = isset($input['password']) ? (string) $input['password'] : '';

if ($username === '' || $password === '') {
    echo json_encode(['success' => false, 'error' => 'Username and password required']);
    exit;
}

$safeUser = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
if ($safeUser === '') {
    echo json_encode(['success' => false, 'error' => 'Invalid username']);
    exit;
}

$usersFile = __DIR__ . '/data/users.json';
$users = [];
if (is_file($usersFile)) {
    $raw = file_get_contents($usersFile);
    if ($raw !== false) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $users = $decoded;
        }
    }
}

if (!isset($users[$safeUser]) || !is_array($users[$safeUser])) {
    echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
    exit;
}

$hash = isset($users[$safeUser]['hash']) ? $users[$safeUser]['hash'] : '';
if ($hash === '' || !password_verify($password, $hash)) {
    echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
    exit;
}

$_SESSION['user'] = $safeUser;
session_regenerate_id(true);
echo json_encode(['success' => true, 'username' => $safeUser]);
exit;
