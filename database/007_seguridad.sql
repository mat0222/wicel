-- Límite de intentos por IP y por cuenta (login, registro, contacto, pedidos).
-- La clave se guarda como hash: no queda registrada la IP ni el email en texto.

CREATE TABLE IF NOT EXISTS security_throttle (
    throttle_key CHAR(64) PRIMARY KEY,
    hits INT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at INT UNSIGNED NOT NULL,
    blocked_until INT UNSIGNED NOT NULL DEFAULT 0,
    INDEX idx_security_throttle_window (window_started_at)
) ENGINE=InnoDB;
