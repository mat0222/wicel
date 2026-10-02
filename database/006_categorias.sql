-- Categorías con ficha propia: solo las que tienen phone_specs piden almacenamiento, RAM e IMEI.
USE wicel;

ALTER TABLE categories
    ADD COLUMN phone_specs BOOLEAN NOT NULL DEFAULT FALSE AFTER description;

UPDATE categories SET phone_specs = TRUE WHERE slug = 'celulares';

INSERT IGNORE INTO categories (name, slug, position) VALUES
('Termos', 'termos', 3),
('Relojes', 'relojes', 4),
('Auriculares', 'auriculares', 5);
