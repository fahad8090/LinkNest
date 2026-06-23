<?php
// backend/api/update_request.php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['id'])) {
    http_response_code(400); echo json_encode(['error' => 'Missing request ID']); exit;
}

try {
    // حماية: التأكد أن الطلب يخص المستخدم الذي سجل دخوله وليس مستخدم آخر
    $checkStmt = $pdo->prepare("SELECT id FROM requests WHERE id = :id AND user_id = :user_id");
    $checkStmt->execute([':id' => $input['id'], ':user_id' => $_SESSION['user_id']]);
    if (!$checkStmt->fetchColumn()) {
        http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit;
    }

    $updateStmt = $pdo->prepare("UPDATE requests SET status = :status, tags = :tags, notes = :notes WHERE id = :id");
    $updateStmt->execute([
        ':status' => $input['status'] ?? 'new',
        ':tags' => json_encode($input['tags'] ?? [], JSON_UNESCAPED_UNICODE),
        ':notes' => $input['notes'] ?? '',
        ':id' => $input['id']
    ]);

    echo json_encode(['status' => 'success']);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['error' => 'Database error']);
}
?>