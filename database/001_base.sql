-- wicel - Base de datos MySQL 8+
-- Version 2: filtros, cuentas web, combos, favoritos, precios ARS/USD, IMEI y trazabilidad mejorada
CREATE DATABASE IF NOT EXISTS wicel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE wicel;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS customer_favorites;
DROP TABLE IF EXISTS product_reviews;
DROP TABLE IF EXISTS product_combo_items;
DROP TABLE IF EXISTS sales_return_items;
DROP TABLE IF EXISTS sales_returns;
DROP TABLE IF EXISTS warranty_claims;
DROP TABLE IF EXISTS warranties;
DROP TABLE IF EXISTS cash_movements;
DROP TABLE IF EXISTS cash_sessions;
DROP TABLE IF EXISTS cash_registers;
DROP TABLE IF EXISTS sale_item_devices;
DROP TABLE IF EXISTS sale_payments;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS coupon_usages;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS promotion_products;
DROP TABLE IF EXISTS promotion_categories;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS shopping_cart_items;
DROP TABLE IF EXISTS shopping_carts;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS loyalty_accounts;
DROP TABLE IF EXISTS inventory_stock;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS imei_devices;
DROP TABLE IF EXISTS purchase_payments;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_specifications;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS storage_options;
DROP TABLE IF EXISTS colors;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS customer_addresses;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS shipping_methods;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS expense_categories;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 1. CONFIGURACION DEL SITIO
-- =========================================================

CREATE TABLE site_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE banners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NULL,
    subtitle VARCHAR(255) NULL,
    image_url VARCHAR(500) NOT NULL,
    button_text VARCHAR(80) NULL,
    button_url VARCHAR(500) NULL,
    position INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_banners_active_position (is_active, position)
) ENGINE=InnoDB;

-- =========================================================
-- 2. USUARIOS / ROLES / PERMISOS
-- =========================================================

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(150) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(30) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- 3. CLIENTES Y DIRECCIONES
-- =========================================================

CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL UNIQUE,
    document_type VARCHAR(20) NULL,
    document_number VARCHAR(30) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NULL,
    last_login_at DATETIME NULL,
    birth_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_customer_document (document_type, document_number),
    INDEX idx_customers_email (email),
    INDEX idx_customers_phone (phone),
    CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE customer_addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(50) NULL,
    recipient_name VARCHAR(200) NULL,
    address_line VARCHAR(255) NOT NULL,
    address_number VARCHAR(20) NULL,
    apartment VARCHAR(50) NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    reference VARCHAR(255) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_addresses_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_customer_addresses_customer (customer_id)
) ENGINE=InnoDB;

-- =========================================================
-- 4. PROVEEDORES Y LOGISTICA
-- =========================================================

CREATE TABLE suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(180) NOT NULL,
    tax_id VARCHAR(30) NULL,
    contact_name VARCHAR(150) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_suppliers_tax_id (tax_id)
) ENGINE=InnoDB;

CREATE TABLE warehouses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    address VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE shipping_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estimated_days VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    code VARCHAR(40) NOT NULL UNIQUE,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- 5. CATALOGO
-- =========================================================

CREATE TABLE brands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    logo_url VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    position INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_categories_parent (parent_id),
    INDEX idx_categories_active_position (is_active, position)
) ENGINE=InnoDB;

CREATE TABLE colors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    hex_code CHAR(7) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE storage_options (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    capacity_gb INT UNSIGNED NOT NULL,
    label VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_storage_capacity (capacity_gb)
) ENGINE=InnoDB;

CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    model VARCHAR(120) NULL,
    description TEXT NULL,
    short_description VARCHAR(500) NULL,
    product_type ENUM('PHONE','ACCESSORY','TABLET','SMARTWATCH','COMBO','OTHER') NOT NULL DEFAULT 'PHONE',
    warranty_months SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_products_brand (brand_id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_active_featured (is_active, is_featured)
) ENGINE=InnoDB;

CREATE TABLE product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(80) NOT NULL UNIQUE,
    barcode VARCHAR(80) NULL UNIQUE,
    color_id BIGINT UNSIGNED NULL,
    storage_id BIGINT UNSIGNED NULL,
    ram_gb INT UNSIGNED NULL,
    condition_type ENUM('NEW','USED','REFURBISHED') NOT NULL DEFAULT 'NEW',
    cost_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    cost_price_usd DECIMAL(14,2) NULL,
    sale_price DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de lista/venta en ARS',
    cash_price DECIMAL(14,2) NULL COMMENT 'Precio especial contado o transferencia en ARS',
    compare_at_price DECIMAL(14,2) NULL COMMENT 'Precio anterior/tachado para ofertas',
    weight_grams INT UNSIGNED NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_variants_color
        FOREIGN KEY (color_id) REFERENCES colors(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_variants_storage
        FOREIGN KEY (storage_id) REFERENCES storage_options(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_variants_product (product_id),
    INDEX idx_variants_active (is_active),
    INDEX idx_variants_condition (condition_type),
    INDEX idx_variants_catalog_filters (condition_type, color_id, storage_id)
) ENGINE=InnoDB;

CREATE TABLE product_specifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL UNIQUE,
    screen_size_inches DECIMAL(4,2) NULL,
    processor VARCHAR(150) NULL,
    ram_gb INT UNSIGNED NULL,
    storage_description VARCHAR(100) NULL,
    battery_mah INT UNSIGNED NULL,
    main_camera VARCHAR(150) NULL,
    selfie_camera VARCHAR(150) NULL,
    operating_system VARCHAR(100) NULL,
    connectivity VARCHAR(255) NULL,
    sim_type VARCHAR(100) NULL,
    charging_port VARCHAR(80) NULL,
    water_resistance VARCHAR(50) NULL,
    extra_notes TEXT NULL,
    CONSTRAINT fk_product_specifications_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255) NULL,
    position INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_product_images_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_product_images_product_position (product_id, position)
) ENGINE=InnoDB;


CREATE TABLE product_combo_items (
    combo_product_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (combo_product_id, variant_id),
    CONSTRAINT fk_combo_items_product
        FOREIGN KEY (combo_product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_combo_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (quantity > 0),
    INDEX idx_combo_items_variant (variant_id)
) ENGINE=InnoDB;

CREATE TABLE customer_favorites (
    customer_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, product_id),
    CONSTRAINT fk_favorites_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_favorites_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE shopping_carts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    session_token VARCHAR(120) NULL UNIQUE,
    status ENUM('ACTIVE','CONVERTED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_shopping_carts_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_shopping_carts_customer_status (customer_id, status)
) ENGINE=InnoDB;

CREATE TABLE shopping_cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_variant (cart_id, variant_id),
    CONSTRAINT fk_shopping_cart_items_cart
        FOREIGN KEY (cart_id) REFERENCES shopping_carts(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_shopping_cart_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (quantity > 0)
) ENGINE=InnoDB;

-- =========================================================
-- 6. COMPRAS E INVENTARIO
-- =========================================================

CREATE TABLE purchases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    supplier_invoice_number VARCHAR(100) NULL,
    purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT','RECEIVED','PARTIAL','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchases_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_purchases_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_purchases_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_purchases_supplier_date (supplier_id, purchase_date),
    INDEX idx_purchases_status (status)
) ENGINE=InnoDB;

CREATE TABLE purchase_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_cost DECIMAL(14,2) NOT NULL,
    unit_cost_usd DECIMAL(14,2) NULL,
    exchange_rate DECIMAL(14,4) NULL COMMENT 'Cotizacion ARS por USD al momento de la compra',
    discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_purchase_items_purchase (purchase_id),
    INDEX idx_purchase_items_variant (variant_id),
    CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE purchase_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    reference VARCHAR(120) NULL,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_payments_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_purchase_payments_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_purchase_payments_purchase (purchase_id)
) ENGINE=InnoDB;

CREATE TABLE inventory_stock (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    minimum_stock INT UNSIGNED NOT NULL DEFAULT 0,
    maximum_stock INT UNSIGNED NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inventory_warehouse_variant (warehouse_id, variant_id),
    CONSTRAINT fk_inventory_stock_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_stock_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    movement_type ENUM('PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN','TRANSFER_OUT','DAMAGED','LOST') NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_cost DECIMAL(14,2) NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_movements_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_stock_movements_variant_date (variant_id, created_at),
    INDEX idx_stock_movements_reference (reference_type, reference_id)
) ENGINE=InnoDB;

-- =========================================================
-- 7. IMEI / EQUIPOS INDIVIDUALES
-- =========================================================

CREATE TABLE imei_devices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NULL,
    imei VARCHAR(30) NOT NULL UNIQUE,
    imei2 VARCHAR(30) NULL UNIQUE,
    serial_number VARCHAR(100) NULL UNIQUE,
    battery_health TINYINT UNSIGNED NULL COMMENT 'Porcentaje de bateria, por ejemplo 95',
    cosmetic_grade VARCHAR(50) NULL COMMENT 'Estado estetico del equipo usado',
    status ENUM('IN_STOCK','RESERVED','SOLD','RETURNED','WARRANTY','DAMAGED','LOST') NOT NULL DEFAULT 'IN_STOCK',
    purchase_id BIGINT UNSIGNED NULL,
    purchase_item_id BIGINT UNSIGNED NULL,
    sale_id BIGINT UNSIGNED NULL,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_imei_devices_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_imei_devices_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_imei_devices_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_imei_devices_purchase_item
        FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (battery_health IS NULL OR battery_health BETWEEN 0 AND 100),
    INDEX idx_imei_devices_variant_status (variant_id, status),
    INDEX idx_imei_devices_warehouse_status (warehouse_id, status),
    INDEX idx_imei_devices_purchase_item (purchase_item_id),
    INDEX idx_imei_devices_battery_condition (battery_health, cosmetic_grade)
) ENGINE=InnoDB;

-- =========================================================
-- 8. PROMOCIONES Y CUPONES
-- =========================================================

CREATE TABLE promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    discount_type ENUM('PERCENTAGE','FIXED_AMOUNT') NOT NULL,
    discount_value DECIMAL(14,2) NOT NULL,
    minimum_purchase DECIMAL(14,2) NULL,
    maximum_discount DECIMAL(14,2) NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_promotions_active_dates (is_active, starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE promotion_products (
    promotion_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT fk_promotion_products_promotion
        FOREIGN KEY (promotion_id) REFERENCES promotions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_promotion_products_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE promotion_categories (
    promotion_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (promotion_id, category_id),
    CONSTRAINT fk_promotion_categories_promotion
        FOREIGN KEY (promotion_id) REFERENCES promotions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_promotion_categories_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE coupons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    discount_type ENUM('PERCENTAGE','FIXED_AMOUNT') NOT NULL,
    discount_value DECIMAL(14,2) NOT NULL,
    minimum_purchase DECIMAL(14,2) NULL,
    maximum_discount DECIMAL(14,2) NULL,
    usage_limit INT UNSIGNED NULL,
    usage_limit_per_customer INT UNSIGNED NULL,
    used_count INT UNSIGNED NOT NULL DEFAULT 0,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coupons_active_dates (is_active, starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE coupon_usages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coupon_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    sale_id BIGINT UNSIGNED NULL,
    used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_coupon_usages_coupon
        FOREIGN KEY (coupon_id) REFERENCES coupons(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_coupon_usages_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_coupon_usages_coupon_customer (coupon_id, customer_id),
    INDEX idx_coupon_usages_sale (sale_id)
) ENGINE=InnoDB;

-- =========================================================
-- 9. PUNTOS
-- =========================================================

CREATE TABLE loyalty_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
    points_balance BIGINT NOT NULL DEFAULT 0,
    tier VARCHAR(50) NOT NULL DEFAULT 'BASIC',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loyalty_accounts_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (points_balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE loyalty_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loyalty_account_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED NULL,
    type ENUM('EARN','REDEEM','ADJUSTMENT_IN','ADJUSTMENT_OUT','EXPIRE') NOT NULL,
    points BIGINT NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loyalty_transactions_account
        FOREIGN KEY (loyalty_account_id) REFERENCES loyalty_accounts(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_loyalty_transactions_account_date (loyalty_account_id, created_at)
) ENGINE=InnoDB;

-- =========================================================
-- 10. VENTAS / PEDIDOS
-- =========================================================

CREATE TABLE sales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    shipping_method_id BIGINT UNSIGNED NULL,
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    sale_channel ENUM('STORE','WEBSITE','WHATSAPP','OTHER') NOT NULL DEFAULT 'STORE',
    status ENUM('PENDING','CONFIRMED','PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
    invoice_type VARCHAR(30) NULL,
    invoice_number VARCHAR(50) NULL,
    customer_name_snapshot VARCHAR(200) NULL,
    customer_email_snapshot VARCHAR(150) NULL,
    customer_phone_snapshot VARCHAR(30) NULL,
    shipping_address_snapshot TEXT NULL,
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    shipping_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    sold_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_sales_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_sales_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sales_shipping_method
        FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_sales_customer_date (customer_id, sold_at),
    INDEX idx_sales_status_date (status, sold_at),
    INDEX idx_sales_channel (sale_channel)
) ENGINE=InnoDB;

ALTER TABLE imei_devices
    ADD CONSTRAINT fk_imei_devices_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE coupon_usages
    ADD CONSTRAINT fk_coupon_usages_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE loyalty_transactions
    ADD CONSTRAINT fk_loyalty_transactions_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE sale_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    product_name_snapshot VARCHAR(180) NOT NULL,
    sku_snapshot VARCHAR(80) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(14,2) NOT NULL,
    discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sale_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_sale_items_sale (sale_id),
    INDEX idx_sale_items_variant (variant_id),
    CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE sale_item_devices (
    sale_item_id BIGINT UNSIGNED NOT NULL,
    imei_device_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (sale_item_id, imei_device_id),
    UNIQUE KEY uq_sale_item_device (imei_device_id),
    CONSTRAINT fk_sale_item_devices_item
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sale_item_devices_device
        FOREIGN KEY (imei_device_id) REFERENCES imei_devices(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sale_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    installments SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    installment_amount DECIMAL(14,2) NULL,
    reference VARCHAR(120) NULL,
    status ENUM('PENDING','APPROVED','REJECTED','REFUNDED') NOT NULL DEFAULT 'APPROVED',
    paid_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sale_payments_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sale_payments_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_sale_payments_sale (sale_id)
) ENGINE=InnoDB;

-- =========================================================
-- 11. CAJA
-- =========================================================

CREATE TABLE cash_registers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE cash_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cash_register_id BIGINT UNSIGNED NOT NULL,
    opened_by BIGINT UNSIGNED NOT NULL,
    closed_by BIGINT UNSIGNED NULL,
    opening_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    closing_amount DECIMAL(14,2) NULL,
    expected_amount DECIMAL(14,2) NULL,
    difference_amount DECIMAL(14,2) NULL,
    status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    notes TEXT NULL,
    CONSTRAINT fk_cash_sessions_register
        FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cash_sessions_opened_by
        FOREIGN KEY (opened_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cash_sessions_closed_by
        FOREIGN KEY (closed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_cash_sessions_status_opened (status, opened_at)
) ENGINE=InnoDB;

CREATE TABLE cash_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cash_session_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    type ENUM('SALE','REFUND','INCOME','EXPENSE','OPENING','CLOSING') NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    description VARCHAR(255) NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cash_movements_session
        FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cash_movements_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_cash_movements_session_date (cash_session_id, created_at)
) ENGINE=InnoDB;

-- =========================================================
-- 12. DEVOLUCIONES / REEMBOLSOS
-- =========================================================

CREATE TABLE sales_returns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    reason VARCHAR(255) NULL,
    status ENUM('REQUESTED','APPROVED','RECEIVED','REFUNDED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
    refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_returns_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sales_returns_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_sales_returns_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_sales_returns_sale_status (sale_id, status)
) ENGINE=InnoDB;

CREATE TABLE sales_return_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT UNSIGNED NOT NULL,
    sale_item_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_refund DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    reason VARCHAR(255) NULL,
    CONSTRAINT fk_sales_return_items_return
        FOREIGN KEY (return_id) REFERENCES sales_returns(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sales_return_items_sale_item
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_sales_return_items_return (return_id)
) ENGINE=InnoDB;

-- =========================================================
-- 13. GARANTIAS
-- =========================================================

CREATE TABLE warranties (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    sale_item_id BIGINT UNSIGNED NULL,
    imei_device_id BIGINT UNSIGNED NULL,
    warranty_number VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('ACTIVE','EXPIRED','VOID','CLAIMED') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_warranties_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_warranties_sale_item
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_warranties_imei
        FOREIGN KEY (imei_device_id) REFERENCES imei_devices(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_warranties_status_dates (status, start_date, end_date)
) ENGINE=InnoDB;

CREATE TABLE warranty_claims (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warranty_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    issue_description TEXT NOT NULL,
    diagnosis TEXT NULL,
    resolution TEXT NULL,
    status ENUM('OPEN','RECEIVED','IN_REVIEW','REPAIRED','REPLACED','REJECTED','CLOSED') NOT NULL DEFAULT 'OPEN',
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_warranty_claims_warranty
        FOREIGN KEY (warranty_id) REFERENCES warranties(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_warranty_claims_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_warranty_claims_user
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_warranty_claims_status_date (status, received_at)
) ENGINE=InnoDB;

-- =========================================================
-- 14. RESEÑAS Y CONTACTO WEB
-- =========================================================

CREATE TABLE product_reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    sale_id BIGINT UNSIGNED NULL,
    rating TINYINT UNSIGNED NOT NULL,
    title VARCHAR(150) NULL,
    comment TEXT NULL,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_reviews_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_product_reviews_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_product_reviews_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (rating BETWEEN 1 AND 5),
    INDEX idx_product_reviews_product_status (product_id, status)
) ENGINE=InnoDB;

CREATE TABLE contact_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    subject VARCHAR(180) NULL,
    message TEXT NOT NULL,
    status ENUM('NEW','READ','REPLIED','CLOSED') NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contact_messages_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_contact_messages_status_date (status, created_at)
) ENGINE=InnoDB;

-- =========================================================
-- 15. GASTOS
-- =========================================================

CREATE TABLE expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    expense_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference VARCHAR(120) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_category
        FOREIGN KEY (category_id) REFERENCES expense_categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_payment_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_expenses_date_category (expense_date, category_id)
) ENGINE=InnoDB;

-- =========================================================
-- 16. AUDITORIA
-- =========================================================

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_user_date (user_id, created_at)
) ENGINE=InnoDB;

-- =========================================================
-- DATOS INICIALES RECOMENDADOS
-- =========================================================

INSERT INTO roles (name, description) VALUES
('ADMINISTRADOR', 'Dueño del local: acceso completo al panel'),
('CLIENTE', 'Cliente registrado en la tienda: suma y canjea puntos');

INSERT INTO payment_methods (name, code, requires_reference) VALUES
('Efectivo', 'CASH', FALSE),
('Transferencia', 'TRANSFER', TRUE),
('Tarjeta de debito', 'DEBIT_CARD', TRUE),
('Tarjeta de credito', 'CREDIT_CARD', TRUE),
('Mercado Pago', 'MERCADOPAGO', TRUE);

INSERT INTO warehouses (name, code, address) VALUES
('Local principal', 'LOCAL-01', NULL);

INSERT INTO cash_registers (name, location) VALUES
('Caja principal', 'Local principal');

INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('store_name', 'wicel', 'Nombre comercial del local'),
('currency', 'ARS', 'Moneda principal'),
('points_per_currency', '1', 'Puntos generados por cada unidad monetaria segun la regla elegida'),
('usd_exchange_rate', '0', 'Cotizacion ARS por USD usada para actualizar precios y costos si el negocio trabaja en dolares');

INSERT INTO expense_categories (name, description) VALUES
('Servicios', 'Luz, internet, telefono y otros servicios'),
('Alquiler', 'Alquiler del local'),
('Marketing', 'Publicidad y promocion'),
('Otros', 'Otros gastos del negocio');

-- Después de este archivo, correr en orden los archivos 002 a 008 de esta carpeta

