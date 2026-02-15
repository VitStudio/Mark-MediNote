<?php
/**
 * Delete .md file — per-user folder
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
$filename = isset($input['filename']) ? basename((string) $input['filename']) : '';

if ($filename === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing filename']);
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

$userDir = getUserDataDir();
if (!$userDir || !is_dir($userDir)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit;
}

$path = $userDir . '/' . $filename;

if (!file_exists($path) || !is_file($path)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit;
}

$realPath = realpath($path);
$realUserDir = realpath($userDir);
if ($realPath === false || $realUserDir === false || strpos($realPath . DIRECTORY_SEPARATOR, $realUserDir . DIRECTORY_SEPARATOR) !== 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid path']);
    exit;
}

if (unlink($path)) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to delete file']);
}
