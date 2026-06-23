<?php
// backend/api/submit_form.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // يسمح للزوار بالإرسال من أي مكان
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method Not Allowed']); exit;
}

require_once '../db.php';
$input = json_decode(file_get_contents('php://input'), true);

$slug = trim($input['slug'] ?? '');
$formData = $input['form_data'] ?? null;

if (empty($slug) || empty($formData)) {
    http_response_code(400); echo json_encode(['error' => 'الرجاء إرسال البيانات المطلوبة']); exit;
}

try {
    // إيجاد معرف صاحب الموقع بناءً على الرابط
    $stmt = $pdo->prepare("SELECT user_id FROM websites WHERE slug = :slug LIMIT 1");
    $stmt->execute([':slug' => $slug]);
    $userId = $stmt->fetchColumn();

    if (!$userId) {
        http_response_code(404); echo json_encode(['error' => 'الموقع غير موجود']); exit;
    }

    // حفظ الفورم بالكامل كـ JSON، مهما كان عدد الحقول
    $formDataJson = json_encode($formData, JSON_UNESCAPED_UNICODE);
    $insertStmt = $pdo->prepare("INSERT INTO requests (user_id, status, form_data, tags, notes) VALUES (:user_id, 'new', :form_data, '[]', '')");
    $insertStmt->execute([
        ':user_id' => $userId,
        ':form_data' => $formDataJson
    ]);

    echo json_encode(['status' => 'success', 'message' => 'تم إرسال الطلب بنجاح']);
} catch (PDOException $e) {
    http_response_code(500); echo json_encode(['error' => 'حدث خطأ داخلي']);
}
?>