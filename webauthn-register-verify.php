<?php
/**
 * WebAuthn registration — verify and store credential
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

requireAuth();

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input) || empty($input['id']) || empty($input['response']['attestationObject'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid credential']);
    exit;
}

$challenge = isset($_SESSION['webauthn_challenge']) ? $_SESSION['webauthn_challenge'] : '';
if ($challenge === '') {
    echo json_encode(['success' => false, 'error' => 'Session expired']);
    exit;
}

$credId = $input['id'];
$attestation = $input['response']['attestationObject'] ?? '';
$clientData = $input['response']['clientDataJSON'] ?? '';

if (!is_string($credId) || strlen($credId) > 512 || !preg_match('/^[A-Za-z0-9_-]+$/', $credId)) {
    echo json_encode(['success' => false, 'error' => 'Invalid credential']);
    exit;
}
if (!is_string($attestation) || strlen($attestation) > 4096 || !preg_match('/^[A-Za-z0-9_-]*$/', $attestation)) {
    echo json_encode(['success' => false, 'error' => 'Invalid credential']);
    exit;
}
if (!is_string($clientData) || strlen($clientData) > 2048 || !preg_match('/^[A-Za-z0-9_-]*$/', $clientData)) {
    echo json_encode(['success' => false, 'error' => 'Invalid credential']);
    exit;
}

$clientDataDecoded = base64url_decode($clientData);
$clientDataJson = $clientDataDecoded ? json_decode($clientDataDecoded, true) : null;
if (!is_array($clientDataJson) || ($clientDataJson['type'] ?? '') !== 'webauthn.create') {
    echo json_encode(['success' => false, 'error' => 'Invalid credential']);
    exit;
}
$clientChallenge = isset($clientDataJson['challenge']) ? $clientDataJson['challenge'] : '';
$expectedB64 = rtrim(strtr($challenge, '+/', '-_'), '=');
if ($clientChallenge !== $expectedB64) {
    echo json_encode(['success' => false, 'error' => 'Challenge mismatch']);
    exit;
}

$userDir = getUserDataDir();
if (!$userDir || !is_dir($userDir)) {
    $base = __DIR__ . '/data';
    $safe = preg_replace('/[^a-zA-Z0-9_]/', '', (string) getCurrentUser());
    if ($safe !== '') {
        $userDir = $base . '/' . $safe;
        if (!is_dir($userDir)) {
            mkdir($userDir, 0755, true);
        }
    }
}

if (!$userDir || !is_dir($userDir)) {
    echo json_encode(['success' => false, 'error' => 'Failed to save']);
    exit;
}

$credsFile = $userDir . '/webauthn_credentials.json';
$creds = [];
if (is_file($credsFile)) {
    $raw = file_get_contents($credsFile);
    $decoded = $raw ? json_decode($raw, true) : [];
    $creds = is_array($decoded) ? $decoded : [];
}

$creds[] = [
    'id' => $credId,
    'attestation' => $attestation,
    'clientData' => $clientData,
    'created' => date('Y-m-d H:i:s')
];

$written = file_put_contents($credsFile, json_encode($creds, JSON_PRETTY_PRINT));
unset($_SESSION['webauthn_challenge']);

if ($written !== false) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save credential']);
}

function base64url_decode($s) {
    $s = str_replace(['-', '_'], ['+', '/'], $s);
    $s .= str_repeat('=', (4 - strlen($s) % 4) % 4);
    return base64_decode($s);
}
