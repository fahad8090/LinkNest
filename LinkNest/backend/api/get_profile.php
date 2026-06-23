<?php
// تحديد نوع المحتوى كـ JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // للسماح بطلبات من الواجهة الأمامية (CORS)

require_once '../db.php';

// 1. التحقق من وجود المتغير slug
if (!isset($_GET['slug']) || empty(trim($_GET['slug']))) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Missing or empty slug parameter']);
    exit;
}

$slug = trim($_GET['slug']);

try {
    // 2. الاستعلام عن بيانات الموقع (باستخدام Prepared Statements)
    $stmtWebsite = $pdo->prepare("SELECT id, title, theme_settings FROM websites WHERE slug = :slug LIMIT 1");
    $stmtWebsite->execute(['slug' => $slug]);
    $website = $stmtWebsite->fetch();

    // إذا لم يتم العثور على الموقع
    if (!$website) {
        http_response_code(404); // Not Found
        echo json_encode(['error' => 'Profile not found']);
        exit;
    }

    // تحويل theme_settings من نص JSON إلى مصفوفة ليكون جاهزاً للطباعة كـ JSON نظيف
    // نستخدم json_decode حتى لا يتم عمل escape له عند استخدام json_encode لاحقاً
    $website['theme_settings'] = $website['theme_settings'] ? json_decode($website['theme_settings'], true) : [];

    // 3. الاستعلام عن البلوكات المرتبطة والمفعلة، مرتبة حسب position
    $stmtBlocks = $pdo->prepare("SELECT id, type, content, position FROM blocks WHERE website_id = :website_id AND is_active = 1 ORDER BY position ASC");
    $stmtBlocks->execute(['website_id' => $website['id']]);
    $blocksRaw = $stmtBlocks->fetchAll();

    $blocks = [];
    foreach ($blocksRaw as $block) {
        // تحويل محتوى البلوك (content) من نص JSON في قاعدة البيانات إلى مصفوفة
        $block['content'] = $block['content'] ? json_decode($block['content'], true) : [];
        
        // التأكد من أن نوع position هو رقم صحيح
        $block['position'] = (int)$block['position'];
        
        $blocks[] = $block;
    }

    // 4. تجميع النتيجة النهائية بالشكل الذي يتوقعه ملف renderBlocks.js
    $response = [
        'website' => $website,
        'blocks' => $blocks
    ];

    // إرجاع النتيجة
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    // التقاط أي أخطاء متعلقة بقاعدة البيانات
    error_log("Database error in get_profile.php: " . $e->getMessage());
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'An internal server error occurred']);
}
