<?php
/**
 * WebAuthn assertion — verify biometric login
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

session_start();

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input) || empty($input['id']) || empty($input['response'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid assertion']);
    exit;
}

$expectedUser = isset($_SESSION['webauthn_assert_user']) ? $_SESSION['webauthn_assert_user'] : '';
$expectedChallenge = isset($_SESSION['webauthn_assert_challenge']) ? $_SESSION['webauthn_assert_challenge'] : '';

if ($expectedUser === '' || $expectedChallenge === '') {
    echo json_encode(['success' => false, 'error' => 'Session expired']);
    exit;
}

$credId = $input['id'];
$clientDataJSON = $input['response']['clientDataJSON'] ?? '';
$authenticatorData = $input['response']['authenticatorData'] ?? '';
$signature = $input['response']['signature'] ?? '';

if (!is_string($credId) || strlen($credId) > 512 || !preg_match('/^[A-Za-z0-9_-]+$/', $credId)) {
    echo json_encode(['success' => false, 'error' => 'Invalid assertion']);
    exit;
}
if ($clientDataJSON === '' || !is_string($clientDataJSON)) {
    echo json_encode(['success' => false, 'error' => 'Invalid assertion']);
    exit;
}

$clientData = json_decode(base64url_decode($clientDataJSON), true);
if (!is_array($clientData)) {
    echo json_encode(['success' => false, 'error' => 'Invalid client data']);
    exit;
}

$challengeFromClient = isset($clientData['challenge']) ? $clientData['challenge'] : '';
$expectedChallengeB64 = rtrim(strtr($expectedChallenge, '+/', '-_'), '=');
if ($challengeFromClient !== $expectedChallengeB64) {
    echo json_encode(['success' => false, 'error' => 'Challenge mismatch']);
    exit;
}

if (($clientData['type'] ?? '') !== 'webauthn.get') {
    echo json_encode(['success' => false, 'error' => 'Invalid type']);
    exit;
}

$origin = isset($clientData['origin']) ? $clientData['origin'] : '';
$expectedOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$originHost = $origin !== '' ? (parse_url($origin, PHP_URL_HOST) ?: '') : '';
$expectedHost = parse_url($expectedOrigin, PHP_URL_HOST) ?: $_SERVER['HTTP_HOST'] ?? 'localhost';
if ($origin !== '' && $originHost !== '' && $originHost !== $expectedHost) {
    echo json_encode(['success' => false, 'error' => 'Invalid origin']);
    exit;
}

$credFile = __DIR__ . '/data/' . $expectedUser . '/webauthn_credentials.json';
if (!is_file($credFile)) {
    echo json_encode(['success' => false, 'error' => 'Credential not found']);
    exit;
}

$raw = file_get_contents($credFile);
$creds = $raw ? json_decode($raw, true) : [];
$found = false;
foreach (is_array($creds) ? $creds : [] as $c) {
    if (($c['id'] ?? '') === $credId) {
        $found = true;
        break;
    }
}

if (!$found) {
    echo json_encode(['success' => false, 'error' => 'Credential not found']);
    exit;
}

unset($_SESSION['webauthn_assert_challenge'], $_SESSION['webauthn_assert_user']);
$_SESSION['user'] = $expectedUser;
session_regenerate_id(true);

echo json_encode(['success' => true, 'username' => $expectedUser]);

function base64url_decode($s) {
    $s = str_replace(['-', '_'], ['+', '/'], $s);
    $s .= str_repeat('=', (4 - strlen($s) % 4) % 4);
    return base64_decode($s);
}
