<?php
// backend/api/save_profile.php

// تعيين ترويسة الاستجابة لتكون JSON
header('Content-Type: application/json; charset=utf-8');

// التأكد من أن الطلب هو POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed. Only POST is accepted.']);
    exit;
}

// استدعاء ملف الاتصال بقاعدة البيانات PDO
require_once '../db.php';

// قراءة بيانات JSON المرسلة
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// التحقق من صحة JSON
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload.']);
    exit;
}

// التحقق من وجود المعرف الخاص بصاحب الموقع
if (empty($input['user_id']) && empty($input['slug'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing user_id or slug to identify the website.']);
    exit;
}

$themeSettings = isset($input['theme_settings']) ? json_encode($input['theme_settings']) : null;
$blocks = isset($input['blocks']) && is_array($input['blocks']) ? $input['blocks'] : [];

try {
    // بدء معاملة (Transaction) لضمان تنفيذ العمليات كلها أو إلغائها معاً عند الخطأ
    $pdo->beginTransaction();

    $websiteId = null;

    // استخراج معرف الموقع وتحديث الإعدادات (Theme Settings)
    if (!empty($input['user_id'])) {
        $stmt = $pdo->prepare('SELECT id FROM websites WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $input['user_id']]);
        $websiteId = $stmt->fetchColumn();

        if ($websiteId && $themeSettings !== null) {
            $updateStmt = $pdo->prepare('UPDATE websites SET theme_settings = :theme WHERE user_id = :user_id');
            $updateStmt->execute([':theme' => $themeSettings, ':user_id' => $input['user_id']]);
        }
    } else if (!empty($input['slug'])) {
        $stmt = $pdo->prepare('SELECT id FROM websites WHERE slug = :slug');
        $stmt->execute([':slug' => $input['slug']]);
        $websiteId = $stmt->fetchColumn();

        if ($websiteId && $themeSettings !== null) {
            $updateStmt = $pdo->prepare('UPDATE websites SET theme_settings = :theme WHERE slug = :slug');
            $updateStmt->execute([':theme' => $themeSettings, ':slug' => $input['slug']]);
        }
    }

    // التأكد من العثور على الموقع
    if (!$websiteId) {
        throw new Exception('Website not found for the given user_id or slug.');
    }

    // التحديث الذكي: مسح البلوكات القديمة لهذا الموقع
    $deleteStmt = $pdo->prepare('DELETE FROM blocks WHERE website_id = :website_id');
    $deleteStmt->execute([':website_id' => $websiteId]);

    // إدراج البلوكات الجديدة بالترتيب المحدث
    if (!empty($blocks)) {
        // إعداد جملة الإدخال مع حماية ضد حقن SQL
        $insertStmt = $pdo->prepare('INSERT INTO blocks (website_id, type, content, position) VALUES (:website_id, :type, :content, :position)');
        
        foreach ($blocks as $index => $block) {
            $type = $block['type'] ?? 'unknown';
            // تحويل المحتوى إلى JSON، وفي حال كان غير موجود نضع كائن فارغ
            $content = isset($block['content']) ? json_encode($block['content']) : '{}';
            // التأكد من أن الترتيب رقم صحيح
            $position = isset($block['position']) ? (int)$block['position'] : ($index + 1);
            
            $insertStmt->execute([
                ':website_id' => $websiteId,
                ':type'       => $type,
                ':content'    => $content,
                ':position'   => $position
            ]);
        }
    }

    // تأكيد المعاملة بعد نجاح جميع الاستعلامات
    $pdo->commit();

    // إرجاع استجابة بنجاح العملية
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Profile and blocks successfully saved.'
    ]);

} catch (Exception $e) {
    // التراجع عن أي تغييرات في قاعدة البيانات في حال حدوث خطأ
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
