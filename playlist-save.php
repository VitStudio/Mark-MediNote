<?php
/**
 * Save playlist (music queue) — per-user
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

requireAuth();

$input = json_decode(file_get_contents('php://input'), true);
$queue = isset($input['queue']) && is_array($input['queue']) ? $input['queue'] : [];
$currentIdx = isset($input['currentIdx']) ? (int) $input['currentIdx'] : -1;

$payload = [
    'default' => $queue,
    'currentIdx' => $currentIdx,
];

$userDir = getUserDataDir();
if (!$userDir || !is_dir($userDir)) {
    $base = __DIR__ . '/data';
    $user = getCurrentUser();
    $safe = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $user);
    if ($safe !== '') {
        $userDir = $base . '/' . $safe;
        if (!is_dir($userDir)) {
            mkdir($userDir, 0755, true);
        }
    }
}

if (!$userDir || !is_dir($userDir)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save playlist']);
    exit;
}

$path = $userDir . '/playlists.json';
$written = file_put_contents($path, json_encode($payload, JSON_PRETTY_PRINT));
if ($written !== false) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save playlist']);
}
