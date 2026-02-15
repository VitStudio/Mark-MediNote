<?php
/**
 * Auth helpers — session, user folder, no warnings
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
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
