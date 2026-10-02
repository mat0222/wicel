-- wicel: base de datos completa en un solo archivo (MySQL 8 o MariaDB 10.6+).
-- Importar en una base vacía ya creada. En Hostinger: hPanel → Bases de datos → crear base y usuario,
-- después phpMyAdmin → elegir la base → Importar → este archivo.
-- En tu compu: mysql -u root -p wicel < database/wicel.sql
--
-- Trae el catálogo, el stock, las categorías y los ajustes de la tienda. Usuarios, clientes, ventas y mensajes
-- arrancan vacíos: el administrador se crea después con api/src/crear-admin.php.
-- La API no tiene que usar root: crear un usuario solo con permisos SELECT, INSERT, UPDATE y DELETE sobre
-- esta base y poner usuario y contraseña en api/config.php.
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `after_sales_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `after_sales_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `request_type` enum('ARREPENTIMIENTO','GARANTIA','CAMBIO','CANCELACION') NOT NULL,
  `sale_id` bigint unsigned NOT NULL,
  `customer_name` varchar(200) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `reason` text,
  `channel` varchar(20) NOT NULL DEFAULT 'WEB',
  `status` enum('RECEIVED','ACCEPTED','RESOLVED','REJECTED') NOT NULL DEFAULT 'RECEIVED',
  `admin_note` varchar(500) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_after_sales_status` (`status`,`created_at`),
  KEY `idx_after_sales_sale` (`sale_id`),
  CONSTRAINT `fk_after_sales_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_user_date` (`user_id`,`created_at`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) DEFAULT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `button_text` varchar(80) DEFAULT NULL,
  `button_url` varchar(500) DEFAULT NULL,
  `position` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_active_position` (`is_active`,`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cash_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cash_session_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `type` enum('SALE','REFUND','INCOME','EXPENSE','OPENING','CLOSING') NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cash_movements_user` (`user_id`),
  KEY `idx_cash_movements_session_date` (`cash_session_id`,`created_at`),
  CONSTRAINT `fk_cash_movements_session` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cash_movements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cash_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_registers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cash_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cash_register_id` bigint unsigned NOT NULL,
  `opened_by` bigint unsigned NOT NULL,
  `closed_by` bigint unsigned DEFAULT NULL,
  `opening_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `closing_amount` decimal(14,2) DEFAULT NULL,
  `expected_amount` decimal(14,2) DEFAULT NULL,
  `difference_amount` decimal(14,2) DEFAULT NULL,
  `status` enum('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `fk_cash_sessions_register` (`cash_register_id`),
  KEY `fk_cash_sessions_opened_by` (`opened_by`),
  KEY `fk_cash_sessions_closed_by` (`closed_by`),
  KEY `idx_cash_sessions_status_opened` (`status`,`opened_at`),
  CONSTRAINT `fk_cash_sessions_closed_by` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cash_sessions_opened_by` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cash_sessions_register` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text,
  `phone_specs` tinyint(1) NOT NULL DEFAULT '0',
  `image_url` varchar(500) DEFAULT NULL,
  `position` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_categories_parent` (`parent_id`),
  KEY `idx_categories_active_position` (`is_active`,`position`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `colors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `hex_code` char(7) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `subject` varchar(180) DEFAULT NULL,
  `message` text NOT NULL,
  `status` enum('NEW','READ','REPLIED','CLOSED') NOT NULL DEFAULT 'NEW',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_contact_messages_customer` (`customer_id`),
  KEY `idx_contact_messages_status_date` (`status`,`created_at`),
  CONSTRAINT `fk_contact_messages_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `coupon_usages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_usages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `used_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_coupon_usages_customer` (`customer_id`),
  KEY `idx_coupon_usages_coupon_customer` (`coupon_id`,`customer_id`),
  KEY `idx_coupon_usages_sale` (`sale_id`),
  CONSTRAINT `fk_coupon_usages_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_coupon_usages_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_coupon_usages_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discount_type` enum('PERCENTAGE','FIXED_AMOUNT') NOT NULL,
  `discount_value` decimal(14,2) NOT NULL,
  `minimum_purchase` decimal(14,2) DEFAULT NULL,
  `maximum_discount` decimal(14,2) DEFAULT NULL,
  `usage_limit` int unsigned DEFAULT NULL,
  `usage_limit_per_customer` int unsigned DEFAULT NULL,
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_coupons_active_dates` (`is_active`,`starts_at`,`ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `customer_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `label` varchar(50) DEFAULT NULL,
  `recipient_name` varchar(200) DEFAULT NULL,
  `address_line` varchar(255) NOT NULL,
  `address_number` varchar(20) DEFAULT NULL,
  `apartment` varchar(50) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_addresses_customer` (`customer_id`),
  CONSTRAINT `fk_customer_addresses_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `customer_consents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_consents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `consent_type` varchar(30) NOT NULL,
  `granted` tinyint(1) NOT NULL,
  `source` varchar(40) NOT NULL,
  `text_version` varchar(20) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_customer_consents_customer` (`customer_id`),
  KEY `fk_customer_consents_sale` (`sale_id`),
  KEY `idx_customer_consents_email` (`email`,`consent_type`,`created_at`),
  CONSTRAINT `fk_customer_consents_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_customer_consents_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `customer_favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_favorites` (
  `customer_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`,`product_id`),
  KEY `fk_favorites_product` (`product_id`),
  CONSTRAINT `fk_favorites_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_favorites_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `document_type` varchar(20) DEFAULT NULL,
  `document_number` varchar(30) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL DEFAULT '',
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_document` (`document_type`,`document_number`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_customers_email` (`email`),
  KEY `idx_customers_phone` (`phone`),
  CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `payment_method_id` bigint unsigned DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reference` varchar(120) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_expenses_category` (`category_id`),
  KEY `fk_expenses_user` (`user_id`),
  KEY `fk_expenses_payment_method` (`payment_method_id`),
  KEY `idx_expenses_date_category` (`expense_date`,`category_id`),
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_payment_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `imei_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `imei_devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `variant_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `imei` varchar(30) NOT NULL,
  `imei2` varchar(30) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `battery_health` tinyint unsigned DEFAULT NULL COMMENT 'Porcentaje de bateria, por ejemplo 95',
  `cosmetic_grade` varchar(50) DEFAULT NULL COMMENT 'Estado estetico del equipo usado',
  `status` enum('IN_STOCK','RESERVED','SOLD','RETURNED','WARRANTY','DAMAGED','LOST') NOT NULL DEFAULT 'IN_STOCK',
  `purchase_id` bigint unsigned DEFAULT NULL,
  `purchase_item_id` bigint unsigned DEFAULT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `imei` (`imei`),
  UNIQUE KEY `imei2` (`imei2`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `fk_imei_devices_purchase` (`purchase_id`),
  KEY `idx_imei_devices_variant_status` (`variant_id`,`status`),
  KEY `idx_imei_devices_warehouse_status` (`warehouse_id`,`status`),
  KEY `idx_imei_devices_purchase_item` (`purchase_item_id`),
  KEY `idx_imei_devices_battery_condition` (`battery_health`,`cosmetic_grade`),
  KEY `fk_imei_devices_sale` (`sale_id`),
  CONSTRAINT `fk_imei_devices_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_imei_devices_purchase_item` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_imei_devices_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_imei_devices_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_imei_devices_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `imei_devices_chk_1` CHECK (((`battery_health` is null) or (`battery_health` between 0 and 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventory_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_stock` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '0',
  `minimum_stock` int unsigned NOT NULL DEFAULT '0',
  `maximum_stock` int unsigned DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_warehouse_variant` (`warehouse_id`,`variant_id`),
  KEY `fk_inventory_stock_variant` (`variant_id`),
  CONSTRAINT `fk_inventory_stock_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `loyalty_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyalty_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `points_balance` bigint NOT NULL DEFAULT '0',
  `tier` varchar(50) NOT NULL DEFAULT 'BASIC',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_id` (`customer_id`),
  CONSTRAINT `fk_loyalty_accounts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `loyalty_accounts_chk_1` CHECK ((`points_balance` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `loyalty_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyalty_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `loyalty_account_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `type` enum('EARN','REDEEM','ADJUSTMENT_IN','ADJUSTMENT_OUT','EXPIRE') NOT NULL,
  `points` bigint NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loyalty_transactions_account_date` (`loyalty_account_id`,`created_at`),
  KEY `fk_loyalty_transactions_sale` (`sale_id`),
  CONSTRAINT `fk_loyalty_transactions_account` FOREIGN KEY (`loyalty_account_id`) REFERENCES `loyalty_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_loyalty_transactions_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `order_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `event_type` varchar(40) NOT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_order_events_user` (`user_id`),
  KEY `idx_order_events_sale` (`sale_id`,`created_at`),
  CONSTRAINT `fk_order_events_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `code` varchar(40) NOT NULL,
  `requires_reference` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_combo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_combo_items` (
  `combo_product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`combo_product_id`,`variant_id`),
  KEY `idx_combo_items_variant` (`variant_id`),
  CONSTRAINT `fk_combo_items_product` FOREIGN KEY (`combo_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_combo_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `product_combo_items_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `position` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_product_images_variant` (`variant_id`),
  KEY `idx_product_images_product_position` (`product_id`,`position`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_product_images_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `rating` tinyint unsigned NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `comment` text,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_product_reviews_customer` (`customer_id`),
  KEY `fk_product_reviews_sale` (`sale_id`),
  KEY `idx_product_reviews_product_status` (`product_id`,`status`),
  CONSTRAINT `fk_product_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_product_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_product_reviews_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `product_reviews_chk_1` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_specifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_specifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `screen_size_inches` decimal(4,2) DEFAULT NULL,
  `processor` varchar(150) DEFAULT NULL,
  `ram_gb` int unsigned DEFAULT NULL,
  `storage_description` varchar(100) DEFAULT NULL,
  `battery_mah` int unsigned DEFAULT NULL,
  `main_camera` varchar(150) DEFAULT NULL,
  `selfie_camera` varchar(150) DEFAULT NULL,
  `operating_system` varchar(100) DEFAULT NULL,
  `connectivity` varchar(255) DEFAULT NULL,
  `sim_type` varchar(100) DEFAULT NULL,
  `charging_port` varchar(80) DEFAULT NULL,
  `water_resistance` varchar(50) DEFAULT NULL,
  `extra_notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `fk_product_specifications_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `sku` varchar(80) NOT NULL,
  `barcode` varchar(80) DEFAULT NULL,
  `color_id` bigint unsigned DEFAULT NULL,
  `storage_id` bigint unsigned DEFAULT NULL,
  `ram_gb` int unsigned DEFAULT NULL,
  `condition_type` enum('NEW','USED','REFURBISHED') NOT NULL DEFAULT 'NEW',
  `cost_price` decimal(14,2) NOT NULL DEFAULT '0.00',
  `cost_price_usd` decimal(14,2) DEFAULT NULL,
  `sale_price` decimal(14,2) NOT NULL DEFAULT '0.00' COMMENT 'Precio de lista/venta en ARS',
  `cash_price` decimal(14,2) DEFAULT NULL COMMENT 'Precio especial contado o transferencia en ARS',
  `compare_at_price` decimal(14,2) DEFAULT NULL COMMENT 'Precio anterior/tachado para ofertas',
  `weight_grams` int unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `fk_variants_color` (`color_id`),
  KEY `fk_variants_storage` (`storage_id`),
  KEY `idx_variants_product` (`product_id`),
  KEY `idx_variants_active` (`is_active`),
  KEY `idx_variants_condition` (`condition_type`),
  KEY `idx_variants_catalog_filters` (`condition_type`,`color_id`,`storage_id`),
  CONSTRAINT `fk_variants_color` FOREIGN KEY (`color_id`) REFERENCES `colors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_variants_storage` FOREIGN KEY (`storage_id`) REFERENCES `storage_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `brand_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `name` varchar(180) NOT NULL,
  `slug` varchar(220) NOT NULL,
  `model` varchar(120) DEFAULT NULL,
  `description` text,
  `short_description` varchar(500) DEFAULT NULL,
  `product_type` enum('PHONE','ACCESSORY','TABLET','SMARTWATCH','COMBO','OTHER') NOT NULL DEFAULT 'PHONE',
  `warranty_months` smallint unsigned NOT NULL DEFAULT '0',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_products_brand` (`brand_id`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_active_featured` (`is_active`,`is_featured`),
  CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promotion_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_categories` (
  `promotion_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`promotion_id`,`category_id`),
  KEY `fk_promotion_categories_category` (`category_id`),
  CONSTRAINT `fk_promotion_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_categories_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promotion_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_products` (
  `promotion_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`promotion_id`,`product_id`),
  KEY `fk_promotion_products_product` (`product_id`),
  CONSTRAINT `fk_promotion_products_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_products_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `discount_type` enum('PERCENTAGE','FIXED_AMOUNT') NOT NULL,
  `discount_value` decimal(14,2) NOT NULL,
  `minimum_purchase` decimal(14,2) DEFAULT NULL,
  `maximum_discount` decimal(14,2) DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promotions_active_dates` (`is_active`,`starts_at`,`ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit_cost` decimal(14,2) NOT NULL,
  `unit_cost_usd` decimal(14,2) DEFAULT NULL,
  `exchange_rate` decimal(14,4) DEFAULT NULL COMMENT 'Cotizacion ARS por USD al momento de la compra',
  `discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(14,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_purchase_items_purchase` (`purchase_id`),
  KEY `idx_purchase_items_variant` (`variant_id`),
  CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_purchase_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchase_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_id` bigint unsigned NOT NULL,
  `payment_method_id` bigint unsigned NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `reference` varchar(120) DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_purchase_payments_method` (`payment_method_id`),
  KEY `idx_purchase_payments_purchase` (`purchase_id`),
  CONSTRAINT `fk_purchase_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_purchase_payments_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `supplier_invoice_number` varchar(100) DEFAULT NULL,
  `purchase_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('DRAFT','RECEIVED','PARTIAL','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_purchases_warehouse` (`warehouse_id`),
  KEY `fk_purchases_user` (`user_id`),
  KEY `idx_purchases_supplier_date` (`supplier_id`,`purchase_date`),
  KEY `idx_purchases_status` (`status`),
  CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_purchases_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_purchases_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reward_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_redemptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) DEFAULT NULL,
  `reward_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `reward_name_snapshot` varchar(150) NOT NULL,
  `points` int unsigned NOT NULL,
  `status` enum('PENDING','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_reward_redemptions_reward` (`reward_id`),
  KEY `idx_reward_redemptions_customer` (`customer_id`,`created_at`),
  KEY `idx_reward_redemptions_status` (`status`,`created_at`),
  CONSTRAINT `fk_reward_redemptions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reward_redemptions_reward` FOREIGN KEY (`reward_id`) REFERENCES `rewards` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rewards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rewards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `points_cost` int unsigned NOT NULL,
  `stock` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rewards_active` (`is_active`,`points_cost`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sale_item_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_item_devices` (
  `sale_item_id` bigint unsigned NOT NULL,
  `imei_device_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`sale_item_id`,`imei_device_id`),
  UNIQUE KEY `uq_sale_item_device` (`imei_device_id`),
  CONSTRAINT `fk_sale_item_devices_device` FOREIGN KEY (`imei_device_id`) REFERENCES `imei_devices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_item_devices_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `product_name_snapshot` varchar(180) NOT NULL,
  `sku_snapshot` varchar(80) NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(14,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale` (`sale_id`),
  KEY `idx_sale_items_variant` (`variant_id`),
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sale_items_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sale_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `payment_method_id` bigint unsigned NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `installments` smallint unsigned NOT NULL DEFAULT '1',
  `installment_amount` decimal(14,2) DEFAULT NULL,
  `reference` varchar(120) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','REFUNDED') NOT NULL DEFAULT 'APPROVED',
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_sale_payments_method` (`payment_method_id`),
  KEY `idx_sale_payments_sale` (`sale_id`),
  CONSTRAINT `fk_sale_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_payments_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `shipping_method_id` bigint unsigned DEFAULT NULL,
  `sale_number` varchar(50) NOT NULL,
  `sale_channel` enum('STORE','WEBSITE','WHATSAPP','OTHER') NOT NULL DEFAULT 'STORE',
  `status` enum('PENDING','CONFIRMED','PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `invoice_type` varchar(30) DEFAULT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `customer_name_snapshot` varchar(200) DEFAULT NULL,
  `customer_email_snapshot` varchar(150) DEFAULT NULL,
  `customer_phone_snapshot` varchar(30) DEFAULT NULL,
  `shipping_address_snapshot` text,
  `delivery_method` enum('PICKUP','SHIPPING') DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `shipping_cost` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `terms_version` varchar(20) DEFAULT NULL,
  `terms_accepted_at` datetime DEFAULT NULL,
  `accepted_ip` varchar(45) DEFAULT NULL,
  `order_snapshot` json DEFAULT NULL,
  `sold_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sale_number` (`sale_number`),
  KEY `fk_sales_user` (`user_id`),
  KEY `fk_sales_warehouse` (`warehouse_id`),
  KEY `fk_sales_shipping_method` (`shipping_method_id`),
  KEY `idx_sales_customer_date` (`customer_id`,`sold_at`),
  KEY `idx_sales_status_date` (`status`,`sold_at`),
  KEY `idx_sales_channel` (`sale_channel`),
  CONSTRAINT `fk_sales_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_shipping_method` FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_return_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_id` bigint unsigned NOT NULL,
  `sale_item_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit_refund` decimal(14,2) NOT NULL DEFAULT '0.00',
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sales_return_items_sale_item` (`sale_item_id`),
  KEY `idx_sales_return_items_return` (`return_id`),
  CONSTRAINT `fk_sales_return_items_return` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_return_items_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_returns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `return_number` varchar(50) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` enum('REQUESTED','APPROVED','RECEIVED','REFUNDED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `refund_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `fk_sales_returns_customer` (`customer_id`),
  KEY `fk_sales_returns_user` (`user_id`),
  KEY `idx_sales_returns_sale_status` (`sale_id`,`status`),
  CONSTRAINT `fk_sales_returns_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_returns_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_returns_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `security_throttle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_throttle` (
  `throttle_key` char(64) NOT NULL,
  `hits` int unsigned NOT NULL DEFAULT '0',
  `window_started_at` int unsigned NOT NULL,
  `blocked_until` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`throttle_key`),
  KEY `idx_security_throttle_window` (`window_started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `shipping_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `estimated_days` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `shopping_cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shopping_cart_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cart_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_variant` (`cart_id`,`variant_id`),
  KEY `fk_shopping_cart_items_variant` (`variant_id`),
  CONSTRAINT `fk_shopping_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `shopping_carts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shopping_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shopping_cart_items_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `shopping_carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shopping_carts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `session_token` varchar(120) DEFAULT NULL,
  `status` enum('ACTIVE','CONVERTED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `idx_shopping_carts_customer_status` (`customer_id`,`status`),
  CONSTRAINT `fk_shopping_carts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `site_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `movement_type` enum('PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN','TRANSFER_OUT','DAMAGED','LOST') NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit_cost` decimal(14,2) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_stock_movements_warehouse` (`warehouse_id`),
  KEY `fk_stock_movements_user` (`user_id`),
  KEY `idx_stock_movements_variant_date` (`variant_id`,`created_at`),
  KEY `idx_stock_movements_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_stock_movements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_movements_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `storage_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storage_options` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `capacity_gb` int unsigned NOT NULL,
  `label` varchar(50) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_storage_capacity` (`capacity_gb`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_name` varchar(180) NOT NULL,
  `tax_id` varchar(30) DEFAULT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_suppliers_tax_id` (`tax_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned NOT NULL,
  `username` varchar(80) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL DEFAULT '',
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(30) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `warranties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warranties` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `sale_item_id` bigint unsigned DEFAULT NULL,
  `imei_device_id` bigint unsigned DEFAULT NULL,
  `warranty_number` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('ACTIVE','EXPIRED','VOID','CLAIMED') NOT NULL DEFAULT 'ACTIVE',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `warranty_number` (`warranty_number`),
  KEY `fk_warranties_sale` (`sale_id`),
  KEY `fk_warranties_sale_item` (`sale_item_id`),
  KEY `fk_warranties_imei` (`imei_device_id`),
  KEY `idx_warranties_status_dates` (`status`,`start_date`,`end_date`),
  CONSTRAINT `fk_warranties_imei` FOREIGN KEY (`imei_device_id`) REFERENCES `imei_devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_warranties_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_warranties_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `warranty_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warranty_claims` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `warranty_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `assigned_user_id` bigint unsigned DEFAULT NULL,
  `claim_number` varchar(50) NOT NULL,
  `issue_description` text NOT NULL,
  `diagnosis` text,
  `resolution` text,
  `status` enum('OPEN','RECEIVED','IN_REVIEW','REPAIRED','REPLACED','REJECTED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `claim_number` (`claim_number`),
  KEY `fk_warranty_claims_warranty` (`warranty_id`),
  KEY `fk_warranty_claims_customer` (`customer_id`),
  KEY `fk_warranty_claims_user` (`assigned_user_id`),
  KEY `idx_warranty_claims_status_date` (`status`,`received_at`),
  CONSTRAINT `fk_warranty_claims_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_warranty_claims_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_warranty_claims_warranty` FOREIGN KEY (`warranty_id`) REFERENCES `warranties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- ===== Datos iniciales de la tienda =====

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

LOCK TABLES `banners` WRITE;
/*!40000 ALTER TABLE `banners` DISABLE KEYS */;
/*!40000 ALTER TABLE `banners` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` (`id`, `name`, `slug`, `logo_url`, `is_active`, `created_at`, `updated_at`) VALUES (1,'Apple','apple',NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(2,'Samsung','samsung',NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(3,'Motorola','motorola',NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(4,'Xiaomi','xiaomi',NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(5,'Realme','realme',NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `cash_registers` WRITE;
/*!40000 ALTER TABLE `cash_registers` DISABLE KEYS */;
INSERT INTO `cash_registers` (`id`, `name`, `location`, `is_active`, `created_at`) VALUES (1,'Caja principal','Local principal',1,'2026-09-28 19:55:46');
/*!40000 ALTER TABLE `cash_registers` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `phone_specs`, `image_url`, `position`, `is_active`, `created_at`, `updated_at`) VALUES (1,NULL,'Celulares','celulares','Teléfonos nuevos y usados',1,NULL,1,1,'2026-09-30 01:45:20','2026-10-02 02:11:21'),(2,NULL,'Combos','combos','Celular con cargador, funda y vidrio templado',0,NULL,2,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(3,NULL,'Termos','termos',NULL,0,NULL,3,1,'2026-10-02 02:11:21','2026-10-02 02:11:21'),(4,NULL,'Relojes','relojes',NULL,0,NULL,4,1,'2026-10-02 02:11:21','2026-10-02 02:11:21'),(5,NULL,'Auriculares','auriculares',NULL,0,NULL,5,1,'2026-10-02 02:11:21','2026-10-02 02:11:21');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `colors` WRITE;
/*!40000 ALTER TABLE `colors` DISABLE KEYS */;
INSERT INTO `colors` (`id`, `name`, `hex_code`, `is_active`) VALUES (1,'Negro','#1c1c1e',1),(2,'Blanco','#f4f4f5',1),(3,'Gris','#6b7280',1),(4,'Plateado','#c0c4cc',1),(5,'Dorado','#d4af37',1),(6,'Azul','#2563eb',1),(7,'Celeste','#7cc4f0',1),(8,'Verde','#1f8a4c',1),(9,'Violeta','#8b7cf6',1),(10,'Lila','#d8b4fe',1),(11,'Rosa','#f4b6c2',1),(12,'Rojo','#c8102e',1),(13,'Magenta','#be185d',1),(14,'Amarillo','#facc15',1);
/*!40000 ALTER TABLE `colors` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
INSERT INTO `expense_categories` (`id`, `name`, `description`, `is_active`, `created_at`) VALUES (1,'Servicios','Luz, internet, telefono y otros servicios',1,'2026-09-28 19:55:46'),(2,'Alquiler','Alquiler del local',1,'2026-09-28 19:55:46'),(3,'Marketing','Publicidad y promocion',1,'2026-09-28 19:55:46'),(4,'Otros','Otros gastos del negocio',1,'2026-09-28 19:55:46');
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `inventory_stock` WRITE;
/*!40000 ALTER TABLE `inventory_stock` DISABLE KEYS */;
INSERT INTO `inventory_stock` (`id`, `warehouse_id`, `variant_id`, `quantity`, `minimum_stock`, `maximum_stock`, `updated_at`) VALUES (1,1,1,11,5,NULL,'2026-10-02 00:39:39'),(2,1,2,24,5,NULL,'2026-09-30 01:54:27'),(3,1,3,3,5,NULL,'2026-09-30 01:45:20'),(4,1,4,30,5,NULL,'2026-09-30 01:45:20'),(5,1,5,2,5,NULL,'2026-10-02 00:39:39'),(6,1,6,0,5,NULL,'2026-09-30 01:45:20'),(7,1,7,0,5,NULL,'2026-09-30 01:45:20'),(8,1,8,0,5,NULL,'2026-09-30 01:45:20'),(9,1,9,0,5,NULL,'2026-09-30 01:45:20');
/*!40000 ALTER TABLE `inventory_stock` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` (`id`, `name`, `code`, `requires_reference`, `is_active`, `created_at`) VALUES (1,'Efectivo','CASH',0,1,'2026-09-28 19:55:46'),(2,'Transferencia','TRANSFER',1,1,'2026-09-28 19:55:46'),(3,'Tarjeta de debito','DEBIT_CARD',1,1,'2026-09-28 19:55:46'),(4,'Tarjeta de credito','CREDIT_CARD',1,1,'2026-09-28 19:55:46'),(5,'Mercado Pago','MERCADOPAGO',1,1,'2026-09-28 19:55:46');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `product_combo_items` WRITE;
/*!40000 ALTER TABLE `product_combo_items` DISABLE KEYS */;
INSERT INTO `product_combo_items` (`combo_product_id`, `variant_id`, `quantity`) VALUES (16,1,1),(17,2,1),(18,3,1),(19,4,1),(20,6,1),(21,9,1);
/*!40000 ALTER TABLE `product_combo_items` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` (`id`, `product_id`, `variant_id`, `image_url`, `alt_text`, `position`, `is_primary`, `created_at`) VALUES (1,1,1,'/assets/phones/iphone-15.jpg','iPhone 15 128GB Rosa',0,1,'2026-09-30 01:45:20'),(2,2,2,'/assets/phones/galaxy-a54.jpg','Samsung Galaxy A54 128GB Violeta',0,1,'2026-09-30 01:45:20'),(3,3,3,'/assets/phones/motorola-edge-40.jpg','Motorola Edge 40 256GB Verde',0,1,'2026-09-30 01:45:20'),(4,4,4,'/assets/phones/redmi-note-12.jpg','Xiaomi Redmi Note 12 128GB Celeste',0,1,'2026-09-30 01:45:20'),(5,5,5,'/assets/phones/iphone-13.jpg','iPhone 13 128GB Azul',0,1,'2026-09-30 01:45:20'),(6,6,6,'/assets/phones/galaxy-s23.jpg','Samsung Galaxy S23 256GB Lila',0,1,'2026-09-30 01:45:20'),(7,7,7,'/assets/phones/realme-c67.jpg','Realme C67 128GB Verde',0,1,'2026-09-30 01:45:20'),(8,8,8,'/assets/phones/motorola-g84.jpg','Motorola G84 256GB Magenta',0,1,'2026-09-30 01:45:20'),(9,9,9,'/assets/phones/poco-x6.jpg','Xiaomi Poco X6 256GB Blanco',0,1,'2026-09-30 01:45:20');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `product_specifications` WRITE;
/*!40000 ALTER TABLE `product_specifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_specifications` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `barcode`, `color_id`, `storage_id`, `ram_gb`, `condition_type`, `cost_price`, `cost_price_usd`, `sale_price`, `cash_price`, `compare_at_price`, `weight_grams`, `is_active`, `created_at`, `updated_at`) VALUES (1,1,'WI-IPHONE-15-128GB-ROSA',NULL,11,2,6,'NEW',0.00,NULL,999999.00,NULL,1099999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(2,2,'WI-SAMSUNG-GALAXY-A54-128GB-VIOLETA',NULL,9,2,8,'NEW',0.00,NULL,424999.00,NULL,499999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(3,3,'WI-MOTOROLA-EDGE-40-256GB-VERDE',NULL,8,3,8,'NEW',0.00,NULL,229999.00,NULL,329999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(4,4,'WI-XIAOMI-REDMI-NOTE-12-128GB-CELESTE',NULL,7,2,6,'NEW',0.00,NULL,239999.00,NULL,299999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(5,5,'WI-IPHONE-13-128GB-AZUL',NULL,6,2,4,'USED',0.00,NULL,679999.00,NULL,719999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(6,6,'WI-SAMSUNG-GALAXY-S23-256GB-LILA',NULL,10,3,8,'NEW',0.00,NULL,859999.00,NULL,NULL,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(7,7,'WI-REALME-C67-128GB-VERDE',NULL,8,2,8,'NEW',0.00,NULL,279999.00,NULL,NULL,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(8,8,'WI-MOTOROLA-G84-256GB-MAGENTA',NULL,13,3,12,'USED',0.00,NULL,549999.00,NULL,609999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(9,9,'WI-XIAOMI-POCO-X6-256GB-BLANCO',NULL,2,3,12,'NEW',0.00,NULL,449999.00,NULL,NULL,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(16,16,'WI-COMBO-IPHONE-15',NULL,NULL,NULL,NULL,'NEW',0.00,NULL,1049999.00,NULL,1119999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(17,17,'WI-COMBO-GALAXY-A54',NULL,NULL,NULL,NULL,'NEW',0.00,NULL,469999.00,NULL,514999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(18,18,'WI-COMBO-EDGE-40',NULL,NULL,NULL,NULL,'NEW',0.00,NULL,274999.00,NULL,309999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(19,19,'WI-COMBO-REDMI-NOTE-12',NULL,NULL,NULL,NULL,'NEW',0.00,NULL,279999.00,NULL,314999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(20,20,'WI-COMBO-GALAXY-S23',NULL,NULL,NULL,NULL,'NEW',0.00,NULL,909999.00,NULL,969999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(21,21,'WI-COMBO-POCO-X6',NULL,NULL,NULL,NULL,'NEW',0.00,NULL,499999.00,NULL,539999.00,NULL,1,'2026-09-30 01:45:20','2026-09-30 01:45:20');
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` (`id`, `brand_id`, `category_id`, `name`, `slug`, `model`, `description`, `short_description`, `product_type`, `warranty_months`, `is_featured`, `is_active`, `created_at`, `updated_at`) VALUES (1,1,1,'iPhone 15 128GB','iphone-15-128gb',NULL,'Chip A16\nCámara principal 48 MP\nPantalla 6,1\"\nUSB-C',NULL,'PHONE',12,1,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(2,2,1,'Samsung Galaxy A54 128GB','samsung-galaxy-a54-128gb',NULL,'Exynos 1380\nCámara triple 50 MP\nPantalla 6,4\"\nBatería 5000 mAh',NULL,'PHONE',12,1,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(3,3,1,'Motorola Edge 40 256GB','motorola-edge-40-256gb',NULL,'Dimensity 8020\nCámara 50 MP\nPantalla 6,55\"\nCarga 68 W',NULL,'PHONE',12,1,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(4,4,1,'Xiaomi Redmi Note 12 128GB','xiaomi-redmi-note-12-128gb',NULL,'Snapdragon 685\nCámara 50 MP\nPantalla 6,67\"\nBatería 5000 mAh',NULL,'PHONE',12,1,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(5,1,1,'iPhone 13 128GB','iphone-13-128gb',NULL,'Batería 87%, equipo usado revisado en el local\nChip A15\nCámara dual 12 MP\nPantalla 6,1\"',NULL,'PHONE',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(6,2,1,'Samsung Galaxy S23 256GB','samsung-galaxy-s23-256gb',NULL,'Snapdragon 8 Gen 2\nCámara 50 MP\nPantalla 6,1\"\nIP68',NULL,'PHONE',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(7,5,1,'Realme C67 128GB','realme-c67-128gb',NULL,'Snapdragon 685\nCámara 108 MP\nPantalla 6,72\"\nBatería 5000 mAh',NULL,'PHONE',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(8,3,1,'Motorola G84 256GB','motorola-g84-256gb',NULL,'Batería 91%, equipo usado revisado en el local\nSnapdragon 695\nCámara 50 MP\nPantalla 6,5\"',NULL,'PHONE',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(9,4,1,'Xiaomi Poco X6 256GB','xiaomi-poco-x6-256gb',NULL,'Dimensity 8300\nCámara 64 MP\nPantalla 6,67\"\nCarga 67 W',NULL,'PHONE',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(16,1,2,'iPhone 15 listo','combo-iphone-15',NULL,'Cargador original 20W\nFunda\nVidrio templado',NULL,'COMBO',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(17,2,2,'Galaxy A54 listo','combo-galaxy-a54',NULL,'Cargador 25W\nFunda\nVidrio templado',NULL,'COMBO',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(18,3,2,'Edge 40 listo','combo-edge-40',NULL,'Cargador 68W\nFunda\nVidrio templado',NULL,'COMBO',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(19,4,2,'Redmi Note 12 listo','combo-redmi-note-12',NULL,'Cargador\nFunda\nVidrio templado',NULL,'COMBO',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(20,2,2,'Galaxy S23 listo','combo-galaxy-s23',NULL,'Cargador 25W\nFunda\nVidrio templado',NULL,'COMBO',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20'),(21,4,2,'Poco X6 listo','combo-poco-x6',NULL,'Cargador 67W\nFunda\nVidrio templado',NULL,'COMBO',12,0,1,'2026-09-30 01:45:20','2026-09-30 01:45:20');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `promotion_categories` WRITE;
/*!40000 ALTER TABLE `promotion_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_categories` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `promotion_products` WRITE;
/*!40000 ALTER TABLE `promotion_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_products` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `rewards` WRITE;
/*!40000 ALTER TABLE `rewards` DISABLE KEYS */;
/*!40000 ALTER TABLE `rewards` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` (`id`, `name`, `description`, `is_active`, `created_at`) VALUES (1,'ADMINISTRADOR','Dueño del local: acceso completo al panel',1,'2026-09-28 19:55:46'),(2,'CLIENTE','Cliente registrado en la tienda: suma y canjea puntos',1,'2026-09-28 19:55:46');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `shipping_methods` WRITE;
/*!40000 ALTER TABLE `shipping_methods` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipping_methods` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `site_settings` WRITE;
/*!40000 ALTER TABLE `site_settings` DISABLE KEYS */;
INSERT INTO `site_settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_at`) VALUES (1,'store_name','wicel','Nombre comercial del local','2026-09-28 19:55:46'),(2,'currency','ARS','Moneda principal','2026-09-28 19:55:46'),(3,'points_per_currency','1','Puntos generados por cada unidad monetaria segun la regla elegida','2026-09-28 19:55:46'),(4,'usd_exchange_rate','0','Cotizacion ARS por USD usada para actualizar precios y costos si el negocio trabaja en dolares','2026-09-28 19:55:46'),(5,'bank_alias','','Alias para transferencias','2026-09-30 01:57:00'),(6,'bank_cbu','','CBU o CVU para transferencias','2026-09-30 01:45:20'),(7,'bank_holder','','Titular de la cuenta','2026-09-30 01:45:20'),(8,'bank_name','','Banco o billetera','2026-09-30 01:45:20'),(17,'legal_name','','Titular o razón social que figura en los textos legales','2026-10-02 00:28:20'),(18,'legal_cuit','','CUIT del titular','2026-10-02 00:28:20'),(19,'legal_tax_status','','Condición frente al IVA','2026-10-02 00:28:20'),(20,'vat_rate','','IVA incluido en los precios, para mostrar el precio sin impuestos nacionales','2026-10-02 00:28:20'),(21,'installments_rate','18','Recargo total de las cuotas, en porcentaje','2026-10-02 00:28:20'),(22,'installments_cftea','','CFTEA de las cuotas informado por el procesador de pagos. Vacío: no se ofrecen cuotas','2026-10-02 00:28:20'),(23,'warranty_extra','','Garantía adicional a la legal, si la hay','2026-10-02 00:28:20'),(24,'exchange_policy','','Política de cambios comerciales, si la hay','2026-10-02 00:28:20');
/*!40000 ALTER TABLE `site_settings` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `storage_options` WRITE;
/*!40000 ALTER TABLE `storage_options` DISABLE KEYS */;
INSERT INTO `storage_options` (`id`, `capacity_gb`, `label`, `is_active`) VALUES (1,64,'64 GB',1),(2,128,'128 GB',1),(3,256,'256 GB',1),(4,512,'512 GB',1),(5,1024,'1 TB',1);
/*!40000 ALTER TABLE `storage_options` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
INSERT INTO `warehouses` (`id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (1,'Local principal','LOCAL-01',NULL,1,'2026-09-28 19:55:46');
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
