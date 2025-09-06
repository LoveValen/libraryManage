-- MySQL初始化脚本
-- 确保数据库和用户正确创建

CREATE DATABASE IF NOT EXISTS library_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER IF NOT EXISTS 'library_user'@'%' IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON library_db.* TO 'library_user'@'%';

-- 确保root用户可以从任何地方访问
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

FLUSH PRIVILEGES;

USE library_db;