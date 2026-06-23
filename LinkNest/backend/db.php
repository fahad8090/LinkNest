<?php
// إعدادات الاتصال بقاعدة البيانات
$host = '127.0.0.1';
$db   = 'linknest'; // اسم قاعدة البيانات
$user = 'root';     // اسم المستخدم (عدله حسب بيئتك)
$pass = '';         // كلمة المرور (عدلها حسب بيئتك)
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// خيارات الـ PDO لضمان الأمان والأداء
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // تفعيل وضع الأخطاء (Exception Mode)
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // إرجاع النتائج كمصفوفة مترابطة
    PDO::ATTR_EMULATE_PREPARES   => false,                  // تعطيل المحاكاة لضمان استخدام Prepared Statements حقيقية من MySQL
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // في بيئة الإنتاج، يفضل تسجيل الخطأ في ملف بدلاً من عرضه للمستخدم
    error_log($e->getMessage());
    exit('فشل الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.');
}
