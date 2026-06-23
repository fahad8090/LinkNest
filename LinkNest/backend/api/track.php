<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // يمكنك تقييد هذا الدومين لاحقاً للحماية
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// التعامل مع طلبات الـ Preflight من المتصفح (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// التأكد من أن الطلب POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

require_once '../db.php';

// قراءة الـ JSON payload
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!isset($data['event_type'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing event_type']);
    exit();
}

$eventType = $data['event_type'];
// جلب IP الزائر وتشفيره لأسباب تتعلق بالخصوصية ولتجنب تخزين IP صريح
$visitorIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$visitorIpHash = hash('sha256', $visitorIp);

try {
    if ($eventType === 'view') {
        if (!isset($data['website_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing website_id']);
            exit();
        }
        
        $stmt = $pdo->prepare("INSERT INTO page_views (website_id, visitor_ip_hash) VALUES (?, ?)");
        $stmt->execute([(int)$data['website_id'], $visitorIpHash]);
        
    } elseif ($eventType === 'click') {
        if (!isset($data['block_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing block_id']);
            exit();
        }
        
        $stmt = $pdo->prepare("INSERT INTO block_clicks (block_id, visitor_ip_hash) VALUES (?, ?)");
        $stmt->execute([(int)$data['block_id'], $visitorIpHash]);
        
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid event_type']);
        exit();
    }
    
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    // تسجيل الخطأ داخلياً دون إظهاره للمستخدم لضمان الحماية
    error_log("Tracking Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal Server Error']);
}
