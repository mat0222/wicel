-- Usuario de la API con lo justo: leer y escribir datos, sin poder borrar tablas, crear usuarios ni tocar otras bases.
-- Correr como root una sola vez, cambiando la contraseña. Después poner usuario y contraseña en api/config.php.
-- En un hosting compartido el usuario se crea desde el panel (cPanel → Bases de datos MySQL) dándole solo estos permisos.
-- '%' permite conectar desde Docker en desarrollo; en el servidor conviene 'localhost'.

CREATE USER IF NOT EXISTS 'wicel_app'@'%' IDENTIFIED BY 'CAMBIAR_POR_UNA_CLAVE_LARGA';
GRANT SELECT, INSERT, UPDATE, DELETE ON wicel.* TO 'wicel_app'@'%';
FLUSH PRIVILEGES;
