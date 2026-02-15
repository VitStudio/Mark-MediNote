<?php
/**
 * List saved .md files — per-user folder
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
requireAuth();

$saveDir = getUserDataDir();
$files = [];
if ($saveDir && is_dir($saveDir)) {
    $glob = glob($saveDir . '/*.md');
    if (is_array($glob)) {
        foreach ($glob as $path) {
            if (is_file($path)) {
                $size = filesize($path);
                $sizeStr = $size < 1024 ? $size . ' B' : round($size / 1024, 1) . ' KB';
                $files[] = [
                    'name'     => basename($path),
                    'size'     => $sizeStr,
                    'modified' => date('Y-m-d H:i', filemtime($path)),
                ];
            }
        }
    }
}
usort($files, function ($a, $b) {
    return strcmp($b['modified'], $a['modified']);
});
echo json_encode(['files' => $files]);
