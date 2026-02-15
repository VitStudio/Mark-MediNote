<?php
/**
 * Auth check — returns current user or 401
 */
require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
setSecurityHeaders();
if (isLoggedIn()) {
    echo json_encode(['success' => true, 'username' => getCurrentUser()]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'redirect' => 'login.html']);
}
