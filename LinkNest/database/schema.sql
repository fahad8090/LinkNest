-- جدول خطط التسعير
CREATE TABLE pricing_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- مثال: Free, Pro
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    features JSON, -- لتخزين الميزات الإضافية بمرونة
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول المستخدمين
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    plan_id INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES pricing_plans(id)
);

-- جدول المواقع (Link-in-bio pages)
CREATE TABLE websites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE, -- علاقة 1:1 لأن كل مستخدم لديه موقع واحد (حالياً)
    slug VARCHAR(100) NOT NULL UNIQUE, -- مثال: linknest.com/username
    custom_domain VARCHAR(255) UNIQUE DEFAULT NULL, -- لدعم النطاقات المخصصة لاحقاً
    title VARCHAR(255) DEFAULT '',
    theme_settings JSON, -- لتخزين ألوان الموقع والخطوط
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (slug), -- فهرس لتسريع البحث عن الموقع بالرابط
    INDEX idx_custom_domain (custom_domain),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول البلوكات
CREATE TABLE blocks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    website_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- مثال: link, text, image, social
    content JSON NOT NULL, -- تخزين البيانات الخاصة بكل نوع
    position INT NOT NULL DEFAULT 0, -- ترتيب البلوك في الصفحة
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_website_position (website_id, position), -- فهرس لتسريع استرجاع البلوكات مرتبة
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- إدخال بيانات تجريبية للخطط
INSERT INTO pricing_plans (name, price, features) VALUES 
('Free', 0.00, '{"max_blocks": 10, "custom_theme": false}'),
('Pro', 9.99, '{"max_blocks": -1, "custom_theme": true}');

-- إضافة عمود نهاية الاشتراك لجدول المستخدمين
ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP NULL;

-- جدول مشاهدات الصفحة
CREATE TABLE page_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    website_id BIGINT NOT NULL,
    visitor_ip_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- جدول النقرات على البلوكات
CREATE TABLE block_clicks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    block_id BIGINT NOT NULL,
    visitor_ip_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);

-- جدول المعاملات المالية
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    gateway_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES pricing_plans(id)
);

-- 1. إضافة حقل الصلاحيات لجدول المستخدمين الحالي
ALTER TABLE users ADD COLUMN role ENUM('super_admin', 'manager', 'support', 'user') DEFAULT 'user';

-- 2. جدول الإيرادات والاشتراكات
CREATE TABLE IF NOT EXISTS system_transactions_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2),
    billing_cycle ENUM('monthly', 'yearly'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. جدول البلاغات والشكاوى
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accuser_email VARCHAR(255),
    website_id INT,
    reason TEXT,
    severity ENUM('low', 'medium', 'high', 'critical'),
    status ENUM('new', 'resolved') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- 4. جدول تتبع عمليات الأدمن (Audit Log)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT,
    action_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);