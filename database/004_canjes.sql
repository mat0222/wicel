-- Premios que el cliente puede canjear con sus puntos.
-- Correr después de 003_catalogo.sql.

USE wicel;

CREATE TABLE IF NOT EXISTS rewards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    points_cost INT UNSIGNED NOT NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rewards_active (is_active, points_cost)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NULL UNIQUE,
    reward_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    reward_name_snapshot VARCHAR(150) NOT NULL,
    points INT UNSIGNED NOT NULL,
    status ENUM('PENDING','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reward_redemptions_reward
        FOREIGN KEY (reward_id) REFERENCES rewards(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reward_redemptions_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_reward_redemptions_customer (customer_id, created_at),
    INDEX idx_reward_redemptions_status (status, created_at)
) ENGINE=InnoDB;
