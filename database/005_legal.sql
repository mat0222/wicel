-- Datos que pide la guía legal de ecommerce: aceptación de términos, comprobante del pedido,
-- historial de estados, botón de arrepentimiento y consentimientos de marketing.
-- Correr después de 004_canjes.sql.

USE wicel;

ALTER TABLE sales
    ADD COLUMN delivery_method ENUM('PICKUP','SHIPPING') NULL AFTER shipping_address_snapshot,
    ADD COLUMN terms_version VARCHAR(20) NULL AFTER notes,
    ADD COLUMN terms_accepted_at DATETIME NULL AFTER terms_version,
    ADD COLUMN accepted_ip VARCHAR(45) NULL AFTER terms_accepted_at,
    ADD COLUMN order_snapshot JSON NULL AFTER accepted_ip;

CREATE TABLE IF NOT EXISTS order_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    detail VARCHAR(255) NULL,
    user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_events_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_events_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_order_events_sale (sale_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS after_sales_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    request_type ENUM('ARREPENTIMIENTO','GARANTIA','CAMBIO','CANCELACION') NOT NULL,
    sale_id BIGINT UNSIGNED NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    reason TEXT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'WEB',
    status ENUM('RECEIVED','ACCEPTED','RESOLVED','REJECTED') NOT NULL DEFAULT 'RECEIVED',
    admin_note VARCHAR(500) NULL,
    ip_address VARCHAR(45) NULL,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_after_sales_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_after_sales_status (status, created_at),
    INDEX idx_after_sales_sale (sale_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_consents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    sale_id BIGINT UNSIGNED NULL,
    email VARCHAR(150) NOT NULL,
    consent_type VARCHAR(30) NOT NULL,
    granted BOOLEAN NOT NULL,
    source VARCHAR(40) NOT NULL,
    text_version VARCHAR(20) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_consents_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_consents_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_customer_consents_email (email, consent_type, created_at)
) ENGINE=InnoDB;

INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('legal_name', '', 'Titular o razón social que figura en los textos legales'),
('legal_cuit', '', 'CUIT del titular'),
('legal_tax_status', '', 'Condición frente al IVA'),
('vat_rate', '', 'IVA incluido en los precios, para mostrar el precio sin impuestos nacionales'),
('installments_rate', '18', 'Recargo total de las cuotas, en porcentaje'),
('installments_cftea', '', 'CFTEA de las cuotas informado por el procesador de pagos. Vacío: no se ofrecen cuotas'),
('warranty_extra', '', 'Garantía adicional a la legal, si la hay'),
('exchange_policy', '', 'Política de cambios comerciales, si la hay')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
