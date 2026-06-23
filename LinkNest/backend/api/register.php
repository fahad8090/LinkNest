<?php
// backend/api/register.php
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$slug = trim($input['slug'] ?? '');

if (empty($email) || empty($password) || empty($slug)) {
    http_response_code(400);
    echo json_encode(['error' => 'الرجاء تعبئة جميع الحقول المطلوبة']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'البريد الإلكتروني غير صالح']);
    exit;
}

if (!preg_match('/^[A-Za-z0-9_-]+$/', $slug)) {
    http_response_code(400);
    echo json_encode(['error' => 'اسم الرابط يحتوي على رموز غير مسموحة']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();

    // إدراج المستخدم (الخطة المجانية الافتراضية plan_id = 1)
    $stmtUser = $pdo->prepare('INSERT INTO users (email, password_hash, plan_id) VALUES (:email, :hash, 1)');
    $stmtUser->execute([':email' => $email, ':hash' => $hash]);
    
    $userId = $pdo->lastInsertId();

    // إدراج الموقع وربطه بالمستخدم
    $stmtWebsite = $pdo->prepare('INSERT INTO websites (user_id, slug, theme_settings) VALUES (:user_id, :slug, :theme)');
    $defaultTheme = json_encode(['bg_color' => '#f3f4f6', 'phone_bg' => '#ffffff']);
    $stmtWebsite->execute([
        ':user_id' => $userId,
        ':slug' => $slug,
        ':theme' => $defaultTheme
    ]);

    $pdo->commit();

    echo json_encode(['status' => 'success', 'message' => 'تم التسجيل بنجاح']);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // التحقق من تكرار الإيميل أو الرابط
    if ($e->getCode() == 23000) {
        echo json_encode(['error' => 'البريد الإلكتروني أو اسم الرابط مستخدم بالفعل.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'حدث خطأ غير متوقع.']);
    }
}
