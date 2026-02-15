<?php
/**
 * Load .md file content — per-user folder
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();
requireAuth();

$filename = isset($_GET['file']) ? basename((string) $_GET['file']) : '';
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
$content = file_get_contents($path);
echo json_encode(['success' => true, 'content' => $content !== false ? $content : '', 'filename' => $filename]);
