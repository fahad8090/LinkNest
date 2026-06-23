<?php
// backend/api/check_auth.php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'logged_in' => true,
        'user_id' => $_SESSION['user_id'],
        'slug' => $_SESSION['slug'] ?? null
    ]);
} else {
    echo json_encode([
        'logged_in' => false
    ]);
}
