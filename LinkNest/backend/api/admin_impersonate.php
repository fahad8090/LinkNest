<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

// التحقق من صلاحية الأدمن
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    die();
}

try {
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $admin = $stmt->fetch();

    if (!$admin || !in_array($admin['role'], ['super_admin', 'manager', 'support'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden. You are not an admin.']);
        die();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $target_user_id = $input['target_user_id'] ?? null;

    if (!$target_user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'بيانات غير مكتملة']);
        die();
    }

    $targetStmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $targetStmt->execute([$target_user_id]);
    if (!$targetStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'المستخدم غير موجود']);
        die();
    }

    // حفظ معرّف الأدمن الأصلي حتى يتمكن من العودة لاحقاً
    $_SESSION['admin_user_id'] = $_SESSION['user_id'];
    $_SESSION['user_id'] = $target_user_id;

    // تسجيل العملية في سجلات الأدمن
    $logStmt = $pdo->prepare("INSERT INTO admin_activity_logs (admin_id, action_type, description) VALUES (?, 'impersonate_user', ?)");
    $logStmt->execute([$_SESSION['admin_user_id'], "Impersonated user $target_user_id"]);

    echo json_encode(['status' => 'success']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
