-- Cuentas con dos roles: ADMINISTRADOR (dueño del local) y CLIENTE.
-- Cada cliente registrado tiene su fila en customers y su cuenta de puntos.
-- Se corre una sola vez sobre una base creada con wicel.sql anterior.

USE wicel;

UPDATE roles SET name = 'ADMINISTRADOR', description = 'Dueño del local: acceso completo al panel' WHERE name = 'ADMIN';
UPDATE roles SET name = 'CLIENTE', description = 'Cliente registrado en la tienda: suma y canjea puntos' WHERE name = 'VENDEDOR';
DELETE FROM roles WHERE name NOT IN ('ADMINISTRADOR', 'CLIENTE');

ALTER TABLE users
    MODIFY last_name VARCHAR(100) NOT NULL DEFAULT '';

ALTER TABLE customers
    MODIFY last_name VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN user_id BIGINT UNSIGNED NULL UNIQUE AFTER id,
    ADD CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
