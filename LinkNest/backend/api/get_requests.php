<?php
// backend/api/get_requests.php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, status, form_data, tags, notes, created_at FROM requests WHERE user_id = :user_id ORDER BY created_at DESC");
    $stmt->execute([':user_id' => $_SESSION['user_id']]);
    $requestsRaw = $stmt->fetchAll();

    $requests = [];
    foreach ($requestsRaw as $req) {
        $date = new DateTime($req['created_at']);
        $requests[] = [
            'id' => $req['id'],
            'status' => $req['status'],
            'tags' => json_decode($req['tags'], true) ?: [],
            'notes' => $req['notes'] ?? '',
            'formData' => json_decode($req['form_data'], true) ?: [],
            'dateStr' => $date->format('d M H:i'),
            'fullDate' => $date->format('F d, Y h:i A')
        ];
    }

    echo json_encode(['status' => 'success', 'data' => $requests], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['error' => 'Database error']);
}
?>