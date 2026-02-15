<?php
/**
 * Load playlist (music queue) — per-user
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
requireAuth();

$userDir = getUserDataDir();
$path = $userDir ? $userDir . '/playlists.json' : '';

if (!$path || !is_file($path)) {
    echo json_encode(['success' => true, 'queue' => [], 'currentIdx' => -1, 'playlists' => []]);
    exit;
}

$raw = file_get_contents($path);
if ($raw === false) {
    echo json_encode(['success' => true, 'queue' => [], 'currentIdx' => -1, 'playlists' => []]);
    exit;
}

$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    echo json_encode(['success' => true, 'queue' => [], 'currentIdx' => -1, 'playlists' => []]);
    exit;
}

$queue = isset($decoded['default']) && is_array($decoded['default']) ? $decoded['default'] : [];
$currentIdx = isset($decoded['currentIdx']) ? (int) $decoded['currentIdx'] : -1;
$playlists = isset($decoded['saved']) && is_array($decoded['saved']) ? $decoded['saved'] : [];

echo json_encode([
    'success' => true,
    'queue' => $queue,
    'currentIdx' => $currentIdx,
    'playlists' => $playlists,
]);
exit;
