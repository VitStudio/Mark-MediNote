<?php
/**
 * Rename .md file — per-user folder
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

requireAuth();

$input = json_decode(file_get_contents('php://input'), true);
$oldName = isset($input['oldName']) ? basename((string) $input['oldName']) : '';
$newName = isset($input['newName']) ? basename((string) $input['newName']) : '';

if ($oldName === '' || $newName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing oldName or newName']);
    exit;
}

if (!preg_match('/\.md$/i', $oldName)) {
    $oldName .= '.md';
}
if (!preg_match('/\.md$/i', $newName)) {
    $newName .= '.md';
}

$dir = getUserDataDir();
if (!$dir || !is_dir($dir)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit;
}

$oldPath = $dir . '/' . $oldName;
$newPath = $dir . '/' . $newName;

if (!file_exists($oldPath) || !is_file($oldPath)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit;
}

if (file_exists($newPath)) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => 'A file with that name already exists']);
    exit;
}

if (rename($oldPath, $newPath)) {
    echo json_encode(['success' => true, 'newName' => $newName]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to rename file']);
}
