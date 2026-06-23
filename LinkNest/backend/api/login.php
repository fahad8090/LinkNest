<?php
// backend/api/login.php
session_start();
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

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'الرجاء تعبئة البريد وكلمة المرور']);
    exit;
}

try {
    // 🌟 التعديل هنا: جلب حقل role من قاعدة البيانات 🌟
    $stmt = $pdo->prepare('
        SELECT u.id, u.password_hash, u.role, w.slug 
        FROM users u 
        LEFT JOIN websites w ON u.id = w.user_id 
        WHERE u.email = :email
    ');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // إنشاء الجلسة وتخزين البيانات
        session_regenerate_id(true); 
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['slug'] = $user['slug'];
        $_SESSION['role'] = $user['role']; // حفظ الرتبة في الجلسة للحماية

        // 🌟 التعديل هنا: إرسال الرتبة للواجهة الأمامية 🌟
        echo json_encode([
            'status' => 'success', 
            'message' => 'تم تسجيل الدخول بنجاح',
            'role' => $user['role'] 
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'حدث خطأ في النظام']);
}
?>