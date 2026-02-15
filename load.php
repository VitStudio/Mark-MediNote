<?php
/**
 * Load .md file content — per-user folder
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
requireAuth();

$filename = isset($_GET['file']) ? basename((string) $_GET['file']) : '';
if (!preg_match('/\.md$/i', $filename)) {
    $filename .= '.md';
}
$userDir = getUserDataDir();
if (!$userDir || !is_dir($userDir)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit;
}
$path = $userDir . '/' . $filename;
if (file_exists($path) && is_file($path)) {
    $content = file_get_contents($path);
    echo json_encode(['success' => true, 'content' => $content !== false ? $content : '', 'filename' => $filename]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
}
