-- Catálogo en la base de datos: marcas, categorías, colores, celulares, combos,
-- stock por color y datos para transferencias. Se puede correr más de una vez.
-- El stock de S23, Realme C67, Moto G84 y Poco X6 arranca en 0: cargalo desde el panel.

SET NAMES utf8mb4;

INSERT IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
('bank_alias', '', 'Alias para transferencias'),
('bank_cbu', '', 'CBU o CVU para transferencias'),
('bank_holder', '', 'Titular de la cuenta'),
('bank_name', '', 'Banco o billetera');

INSERT IGNORE INTO categories (name, slug, description, position) VALUES
('Celulares', 'celulares', 'Teléfonos nuevos y usados', 1),
('Combos', 'combos', 'Celular con cargador, funda y vidrio templado', 2);

INSERT IGNORE INTO brands (name, slug) VALUES
('Apple', 'apple'), ('Samsung', 'samsung'), ('Motorola', 'motorola'), ('Xiaomi', 'xiaomi'), ('Realme', 'realme');

INSERT IGNORE INTO colors (name, hex_code) VALUES
('Negro', '#1c1c1e'), ('Blanco', '#f4f4f5'), ('Gris', '#6b7280'), ('Plateado', '#c0c4cc'),
('Dorado', '#d4af37'), ('Azul', '#2563eb'), ('Celeste', '#7cc4f0'), ('Verde', '#1f8a4c'),
('Violeta', '#8b7cf6'), ('Lila', '#d8b4fe'), ('Rosa', '#f4b6c2'), ('Rojo', '#c8102e'),
('Magenta', '#be185d'), ('Amarillo', '#facc15');

INSERT IGNORE INTO storage_options (capacity_gb, label) VALUES
(64, '64 GB'), (128, '128 GB'), (256, '256 GB'), (512, '512 GB'), (1024, '1 TB');

DROP TEMPORARY TABLE IF EXISTS seed_phones;
CREATE TEMPORARY TABLE seed_phones (
    slug VARCHAR(120), name VARCHAR(180), brand VARCHAR(100), storage_gb INT, ram INT,
    cond VARCHAR(10), price DECIMAL(14,2), old_price DECIMAL(14,2) NULL, featured TINYINT,
    color VARCHAR(60), stock INT, image VARCHAR(255), description TEXT
);

INSERT INTO seed_phones VALUES
('iphone-15-128gb', 'iPhone 15 128GB', 'Apple', 128, 6, 'NEW', 999999, 1099999, 1, 'Rosa', 12, '/assets/phones/iphone-15.jpg', 'Chip A16\nCámara principal 48 MP\nPantalla 6,1"\nUSB-C'),
('samsung-galaxy-a54-128gb', 'Samsung Galaxy A54 128GB', 'Samsung', 128, 8, 'NEW', 424999, 499999, 1, 'Violeta', 25, '/assets/phones/galaxy-a54.jpg', 'Exynos 1380\nCámara triple 50 MP\nPantalla 6,4"\nBatería 5000 mAh'),
('motorola-edge-40-256gb', 'Motorola Edge 40 256GB', 'Motorola', 256, 8, 'NEW', 229999, 329999, 1, 'Verde', 3, '/assets/phones/motorola-edge-40.jpg', 'Dimensity 8020\nCámara 50 MP\nPantalla 6,55"\nCarga 68 W'),
('xiaomi-redmi-note-12-128gb', 'Xiaomi Redmi Note 12 128GB', 'Xiaomi', 128, 6, 'NEW', 239999, 299999, 1, 'Celeste', 30, '/assets/phones/redmi-note-12.jpg', 'Snapdragon 685\nCámara 50 MP\nPantalla 6,67"\nBatería 5000 mAh'),
('iphone-13-128gb', 'iPhone 13 128GB', 'Apple', 128, 4, 'USED', 679999, 719999, 0, 'Azul', 2, '/assets/phones/iphone-13.jpg', 'Batería 87%, equipo usado revisado en el local\nChip A15\nCámara dual 12 MP\nPantalla 6,1"'),
('samsung-galaxy-s23-256gb', 'Samsung Galaxy S23 256GB', 'Samsung', 256, 8, 'NEW', 859999, NULL, 0, 'Lila', 0, '/assets/phones/galaxy-s23.jpg', 'Snapdragon 8 Gen 2\nCámara 50 MP\nPantalla 6,1"\nIP68'),
('realme-c67-128gb', 'Realme C67 128GB', 'Realme', 128, 8, 'NEW', 279999, NULL, 0, 'Verde', 0, '/assets/phones/realme-c67.jpg', 'Snapdragon 685\nCámara 108 MP\nPantalla 6,72"\nBatería 5000 mAh'),
('motorola-g84-256gb', 'Motorola G84 256GB', 'Motorola', 256, 12, 'USED', 549999, 609999, 0, 'Magenta', 0, '/assets/phones/motorola-g84.jpg', 'Batería 91%, equipo usado revisado en el local\nSnapdragon 695\nCámara 50 MP\nPantalla 6,5"'),
('xiaomi-poco-x6-256gb', 'Xiaomi Poco X6 256GB', 'Xiaomi', 256, 12, 'NEW', 449999, NULL, 0, 'Blanco', 0, '/assets/phones/poco-x6.jpg', 'Dimensity 8300\nCámara 64 MP\nPantalla 6,67"\nCarga 67 W');

INSERT IGNORE INTO products (brand_id, category_id, name, slug, description, product_type, warranty_months, is_featured)
SELECT b.id, c.id, s.name, s.slug, s.description, 'PHONE', 12, s.featured
FROM seed_phones s
JOIN brands b ON b.name = s.brand
JOIN categories c ON c.slug = 'celulares';

INSERT IGNORE INTO product_variants (product_id, sku, color_id, storage_id, ram_gb, condition_type, sale_price, compare_at_price)
SELECT p.id, UPPER(CONCAT('WI-', s.slug, '-', s.color)), col.id, so.id, s.ram, s.cond, s.price, s.old_price
FROM seed_phones s
JOIN products p ON p.slug = s.slug
JOIN colors col ON col.name = s.color
JOIN storage_options so ON so.capacity_gb = s.storage_gb;

INSERT IGNORE INTO inventory_stock (warehouse_id, variant_id, quantity, minimum_stock)
SELECT w.id, v.id, s.stock, 5
FROM seed_phones s
JOIN product_variants v ON v.sku = UPPER(CONCAT('WI-', s.slug, '-', s.color))
JOIN warehouses w ON w.code = 'LOCAL-01';

INSERT INTO product_images (product_id, variant_id, image_url, alt_text, is_primary)
SELECT v.product_id, v.id, s.image, CONCAT(s.name, ' ', s.color), 1
FROM seed_phones s
JOIN product_variants v ON v.sku = UPPER(CONCAT('WI-', s.slug, '-', s.color))
WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.variant_id = v.id);

DROP TEMPORARY TABLE IF EXISTS seed_combos;
CREATE TEMPORARY TABLE seed_combos (
    slug VARCHAR(120), name VARCHAR(180), phone_slug VARCHAR(120), price DECIMAL(14,2), old_price DECIMAL(14,2), description TEXT
);

INSERT INTO seed_combos VALUES
('combo-iphone-15', 'iPhone 15 listo', 'iphone-15-128gb', 1049999, 1119999, 'Cargador original 20W\nFunda\nVidrio templado'),
('combo-galaxy-a54', 'Galaxy A54 listo', 'samsung-galaxy-a54-128gb', 469999, 514999, 'Cargador 25W\nFunda\nVidrio templado'),
('combo-edge-40', 'Edge 40 listo', 'motorola-edge-40-256gb', 274999, 309999, 'Cargador 68W\nFunda\nVidrio templado'),
('combo-redmi-note-12', 'Redmi Note 12 listo', 'xiaomi-redmi-note-12-128gb', 279999, 314999, 'Cargador\nFunda\nVidrio templado'),
('combo-galaxy-s23', 'Galaxy S23 listo', 'samsung-galaxy-s23-256gb', 909999, 969999, 'Cargador 25W\nFunda\nVidrio templado'),
('combo-poco-x6', 'Poco X6 listo', 'xiaomi-poco-x6-256gb', 499999, 539999, 'Cargador 67W\nFunda\nVidrio templado');

INSERT IGNORE INTO products (brand_id, category_id, name, slug, description, product_type, warranty_months)
SELECT phone.brand_id, c.id, s.name, s.slug, s.description, 'COMBO', 12
FROM seed_combos s
JOIN products phone ON phone.slug = s.phone_slug
JOIN categories c ON c.slug = 'combos';

INSERT IGNORE INTO product_variants (product_id, sku, sale_price, compare_at_price)
SELECT p.id, UPPER(CONCAT('WI-', s.slug)), s.price, s.old_price
FROM seed_combos s
JOIN products p ON p.slug = s.slug;

INSERT IGNORE INTO product_combo_items (combo_product_id, variant_id, quantity)
SELECT combo.id, pv.id, 1
FROM seed_combos s
JOIN products combo ON combo.slug = s.slug
JOIN products phone ON phone.slug = s.phone_slug
JOIN product_variants pv ON pv.product_id = phone.id;

DROP TEMPORARY TABLE IF EXISTS seed_phones;
DROP TEMPORARY TABLE IF EXISTS seed_combos;
