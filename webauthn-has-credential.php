<?php
/**
 * Check if user has biometric credential registered
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
requireAuth();

$userDir = getUserDataDir();
$credFile = $userDir ? $userDir . '/webauthn_credentials.json' : '';
$hasCredential = false;

if ($credFile && is_file($credFile)) {
    $raw = file_get_contents($credFile);
    $creds = $raw ? json_decode($raw, true) : [];
    $hasCredential = is_array($creds) && count($creds) > 0;
}

echo json_encode(['hasCredential' => $hasCredential]);
