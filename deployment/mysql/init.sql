-- MySQL初始化脚本
-- 确保数据库和用户正确创建

CREATE DATABASE IF NOT EXISTS library_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER IF NOT EXISTS 'library_user'@'%' IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON library_db.* TO 'library_user'@'%';

-- 确保root用户可以从任何地方访问 (MySQL 8.4 兼容写法)
-- 先创建 root@'%' 用户（如果不存在）
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'root';
-- 授予所有权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 更新密码认证方式（确保兼容性）
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root';
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';

FLUSH PRIVILEGES;

USE library_db;