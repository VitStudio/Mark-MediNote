<?php
/**
 * WebAuthn assertion — get options for biometric login (by username)
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();

$username = isset($_GET['username']) ? trim((string) $_GET['username']) : '';
$safeUser = preg_replace('/[^a-zA-Z0-9_]/', '', $username);

if ($safeUser === '') {
    echo json_encode(['success' => false, 'error' => 'Username required']);
    exit;
}

session_start();
$challenge = random_bytes(32);
$_SESSION['webauthn_assert_challenge'] = base64_encode($challenge);
$_SESSION['webauthn_assert_user'] = $safeUser;

$credFile = __DIR__ . '/data/' . $safeUser . '/webauthn_credentials.json';
$allowCredentials = [];

if (is_file($credFile)) {
    $raw = file_get_contents($credFile);
    $creds = $raw ? json_decode($raw, true) : [];
    if (is_array($creds)) {
        foreach ($creds as $c) {
            if (!empty($c['id'])) {
                $allowCredentials[] = [
                    'type' => 'public-key',
                    'id' => $c['id']
                ];
            }
        }
    }
}

if (empty($allowCredentials)) {
    echo json_encode(['success' => false, 'error' => 'No biometric credential for this user']);
    exit;
}

$options = [
    'challenge' => rtrim(strtr(base64_encode($challenge), '+/', '-_'), '='),
    'timeout' => 60000,
    'rpId' => isset($_SERVER['HTTP_HOST']) ? preg_replace('/^www\./', '', $_SERVER['HTTP_HOST']) : 'localhost',
    'allowCredentials' => $allowCredentials,
    'userVerification' => 'preferred'
];

echo json_encode(['success' => true, 'options' => $options]);
