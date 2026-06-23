<?php
// backend/api/get_admin_master_data.php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

// 1. التحقق من تسجيل الدخول
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    // 2. التحقق من صلاحيات الإدارة (Role-Based Access Control)
    $stmt = $pdo->prepare("SELECT email, role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $admin = $stmt->fetch();

    if (!$admin || !in_array($admin['role'], ['super_admin', 'manager', 'support'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden. You are not an admin.']);
        exit;
    }

    // 3. جمع الإحصائيات الكلية
    $total_users = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $active_websites = $pdo->query("SELECT COUNT(*) FROM websites")->fetchColumn();
    
    // جلب الترافيك (من ملف track.php الذي برمجته سابقاً)
    $views = $pdo->query("SELECT COUNT(*) FROM page_views")->fetchColumn();
    $clicks = $pdo->query("SELECT COUNT(*) FROM block_clicks")->fetchColumn();
    $platform_traffic = $views + $clicks;

    // 4. الحسابات المالية
    $monthly_revenue = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM system_transactions_logs WHERE billing_cycle = 'monthly'")->fetchColumn();
    $yearly_revenue = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM system_transactions_logs WHERE billing_cycle = 'yearly'")->fetchColumn();
    $gross_profit = $monthly_revenue + $yearly_revenue;

    // 5. جلب اللوقات الحديثة (النظام والإدارة)
    $recent_users = $pdo->query("SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    $recent_websites = $pdo->query("SELECT slug, created_at FROM websites ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    $recent_reports = $pdo->query("SELECT id, reason, created_at FROM reports ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    
    $admin_logs = $pdo->query("SELECT l.*, u.email FROM admin_activity_logs l JOIN users u ON l.admin_id = u.id ORDER BY l.created_at DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);

    // 6. قائمة المستخدمين لجدول الإدارة
    $users_list = $pdo->query("SELECT u.id, u.email, u.created_at, u.plan_id, w.slug FROM users u LEFT JOIN websites w ON u.id = w.user_id ORDER BY u.created_at DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);

    // إرسال الحزمة الكاملة للوحة التحكم
    echo json_encode([
        'status' => 'success',
        'admin_info' => [
            'email' => $admin['email'],
            'role' => $admin['role']
        ],
        'metrics' => [
            'total_users' => $total_users,
            'active_websites' => $active_websites,
            'platform_traffic' => $platform_traffic,
            'monthly_revenue' => $monthly_revenue,
            'yearly_revenue' => $yearly_revenue,
            'gross_profit' => $gross_profit
        ],
        'ecosystem_logs' => [
            'users' => $recent_users,
            'websites' => $recent_websites,
            'reports' => $recent_reports
        ],
        'admin_logs' => $admin_logs,
        'users_list' => $users_list
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>