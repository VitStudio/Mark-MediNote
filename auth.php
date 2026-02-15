<?php
/**
 * Auth helpers — session, user folder, security headers
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function setSecurityHeaders() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.youtube.com https://www.google.com; style-src \'self\' \'unsafe-inline\' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src \'self\' data: https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src \'self\' data: https:; frame-src https://www.youtube.com; connect-src \'self\' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;');
}

function isLoggedIn() {
    return isset($_SESSION['user']) && is_string($_SESSION['user']) && $_SESSION['user'] !== '';
}

function getCurrentUser() {
    return isLoggedIn() ? $_SESSION['user'] : null;
}

function requireAuth() {
    if (!isLoggedIn()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized', 'redirect' => 'login.html']);
        exit;
    }
}

function sanitizeUsername($u) {
    return preg_replace('/[^a-zA-Z0-9_]/', '', (string) $u);
}

function getUserDataDir() {
    $user = getCurrentUser();
    if (!$user) return null;
    $safe = sanitizeUsername($user);
    if ($safe === '') return null;
    return __DIR__ . '/data/' . $safe;
}
