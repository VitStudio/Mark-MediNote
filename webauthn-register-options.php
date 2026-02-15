<?php
/**
 * WebAuthn registration — get options for credential creation
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();
requireAuth();

$user = getCurrentUser();
if (!$user) {
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}

$challenge = random_bytes(32);
$_SESSION['webauthn_challenge'] = base64_encode($challenge);

$userId = hash('sha256', $user, true);
$options = [
    'challenge' => rtrim(strtr(base64_encode($challenge), '+/', '-_'), '='),
    'rp' => [
        'name' => 'Markdown Editor',
        'id' => isset($_SERVER['HTTP_HOST']) ? preg_replace('/^www\./', '', $_SERVER['HTTP_HOST']) : 'localhost'
    ],
    'user' => [
        'id' => rtrim(strtr(base64_encode($userId), '+/', '-_'), '='),
        'name' => $user,
        'displayName' => $user
    ],
    'pubKeyCredParams' => [
        ['type' => 'public-key', 'alg' => -7],
        ['type' => 'public-key', 'alg' => -257]
    ],
    'timeout' => 60000,
    'authenticatorSelection' => [
        'authenticatorAttachment' => 'platform',
        'userVerification' => 'preferred',
        'residentKey' => 'preferred'
    ]
];

$userDir = getUserDataDir();
$credFile = $userDir ? $userDir . '/webauthn_credentials.json' : '';
$excludeIds = [];
if ($credFile && is_file($credFile)) {
    $raw = file_get_contents($credFile);
    $creds = $raw ? json_decode($raw, true) : [];
    if (is_array($creds)) {
        foreach ($creds as $c) {
            if (isset($c['id'])) {
                $excludeIds[] = ['type' => 'public-key', 'id' => $c['id']];
            }
        }
    }
}
if (!empty($excludeIds)) {
    $options['excludeCredentials'] = $excludeIds;
}

echo json_encode(['success' => true, 'options' => $options]);
