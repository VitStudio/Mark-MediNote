<?php
/**
 * Register endpoint — POST username, password
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/auth.php';

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
if ($safeUser === '' || strlen($safeUser) < 2) {
    echo json_encode(['success' => false, 'error' => 'Username must be at least 2 alphanumeric characters']);
    exit;
}

if (strlen($password) < 4) {
    echo json_encode(['success' => false, 'error' => 'Password must be at least 4 characters']);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$usersFile = $dataDir . '/users.json';
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

if (isset($users[$safeUser])) {
    echo json_encode(['success' => false, 'error' => 'Username already taken']);
    exit;
}

$users[$safeUser] = [
    'hash' => password_hash($password, PASSWORD_DEFAULT),
    'created' => date('Y-m-d'),
];

$userDir = $dataDir . '/' . $safeUser;
if (!is_dir($userDir)) {
    mkdir($userDir, 0755, true);
}

$written = file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
if ($written === false) {
    echo json_encode(['success' => false, 'error' => 'Registration failed']);
    exit;
}

$_SESSION['user'] = $safeUser;
echo json_encode(['success' => true, 'username' => $safeUser]);
exit;
