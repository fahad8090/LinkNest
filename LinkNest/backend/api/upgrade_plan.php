<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

// التحقق من تسجيل الدخول
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'يرجى تسجيل الدخول أولاً']);
    die();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    die();
}

$input = json_decode(file_get_contents('php://input'), true);
$plan_id = $input['plan_id'] ?? 2;

// Get correct price from DB based on plan_id instead of trusting client
$stmtPrice = $pdo->prepare("SELECT price FROM pricing_plans WHERE id = ?");
$stmtPrice->execute([$plan_id]);
$planData = $stmtPrice->fetch(PDO::FETCH_ASSOC);

if (!$planData) {
    http_response_code(400);
    echo json_encode(['error' => 'الخطة غير موجودة']);
    die();
}

$amount = $planData['price'];
$user_id = $_SESSION['user_id'];

try {
    $pdo->beginTransaction();

    // ترقية خطة المستخدم
    $stmtUser = $pdo->prepare('UPDATE users SET plan_id = :plan_id WHERE id = :id');
    $stmtUser->execute([':plan_id' => $plan_id, ':id' => $user_id]);

    // تسجيل المعاملة المالية في transactions
    $stmtTx = $pdo->prepare("INSERT INTO transactions (user_id, plan_id, amount, status) VALUES (:user_id, :plan_id, :amount, 'completed')");
    $stmtTx->execute([
        ':user_id' => $user_id,
        ':plan_id' => $plan_id,
        ':amount' => $amount
    ]);

    // تسجيل في log الإيرادات (إذا لزم)
    $stmtLog = $pdo->prepare("INSERT INTO system_transactions_logs (user_id, amount, billing_cycle) VALUES (:user_id, :amount, 'monthly')");
    $stmtLog->execute([
        ':user_id' => $user_id,
        ':amount' => $amount
    ]);

    $pdo->commit();

    echo json_encode(['status' => 'success', 'message' => 'تم الترقية بنجاح']);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'حدث خطأ أثناء معالجة الترقية.', 'details' => $e->getMessage()]);
}
?>
