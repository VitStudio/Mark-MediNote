<?php
/**
 * Save Markdown file endpoint — per-user folder
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

requireAuth();

$input = json_decode(file_get_contents('php://input'), true);
$content = isset($input['content']) ? $input['content'] : '';
$filename = isset($input['filename']) ? basename((string) $input['filename']) : '';

if ($content === '' || $filename === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing content or filename']);
    exit;
}

if (!preg_match('/\.md$/i', $filename)) {
    $filename .= '.md';
}
if (!preg_match('/^[a-zA-Z0-9_\-]+\.md$/i', $filename)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid filename']);
    exit;
}

$saveDir = getUserDataDir();
if (!$saveDir || !is_dir($saveDir)) {
    $base = __DIR__ . '/data';
    $user = getCurrentUser();
    $safe = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $user);
    if ($safe !== '') {
        $saveDir = $base . '/' . $safe;
        if (!is_dir($saveDir)) {
            mkdir($saveDir, 0755, true);
        }
    }
}

if (!$saveDir || !is_dir($saveDir)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to create user folder']);
    exit;
}

$filepath = $saveDir . '/' . $filename;
$realSaveDir = realpath($saveDir);
$realParent = realpath(dirname($filepath));
if ($realSaveDir === false || $realParent === false || $realParent !== $realSaveDir) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid path']);
    exit;
}

if (file_put_contents($filepath, $content) !== false) {
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'path' => 'data/' . getCurrentUser() . '/' . $filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}
