<?php

declare(strict_types=1);

final class Security
{
    public const ADMIN_IDLE = 1800;
    public const ADMIN_MAX = 28800;

    /** Corta con 429 si la clave está bloqueada. */
    public static function guard(PDO $pdo, string $key): void
    {
        $stmt = $pdo->prepare('SELECT blocked_until FROM security_throttle WHERE throttle_key = ?');
        $stmt->execute([self::hash($key)]);
        $wait = (int) $stmt->fetchColumn() - time();
        if ($wait > 0) {
            header('Retry-After: ' . $wait);
            $minutes = (int) ceil($wait / 60);
            respond(429, ['error' => 'Hubo demasiados intentos. Esperá ' . ($minutes === 1 ? 'un minuto' : "{$minutes} minutos") . ' y volvé a intentar.']);
        }
    }

    /** Suma un intento; si llega a $max dentro de $window segundos, bloquea la clave $block segundos. */
    public static function hit(PDO $pdo, string $key, int $max, int $window, int $block): void
    {
        $now = time();
        $hash = self::hash($key);
        $pdo->prepare(
            'INSERT INTO security_throttle (throttle_key, hits, window_started_at) VALUES (?, 1, ?)
             ON DUPLICATE KEY UPDATE
                 hits = IF(window_started_at < ?, 1, hits + 1),
                 window_started_at = IF(window_started_at < ?, VALUES(window_started_at), window_started_at)'
        )->execute([$hash, $now, $now - $window, $now - $window]);
        $pdo->prepare('UPDATE security_throttle SET blocked_until = ?, hits = 0, window_started_at = ? WHERE throttle_key = ? AND hits >= ?')
            ->execute([$now + $block, $now, $hash, $max]);

        if (random_int(1, 200) === 1) {
            $pdo->prepare('DELETE FROM security_throttle WHERE window_started_at < ? AND blocked_until < ?')->execute([$now - 86400, $now]);
        }
    }

    public static function clear(PDO $pdo, string $key): void
    {
        $pdo->prepare('DELETE FROM security_throttle WHERE throttle_key = ?')->execute([self::hash($key)]);
    }

    public static function ip(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? 'sin-ip');
    }

    /** Huella del navegador: si la cookie de sesión se roba y se usa desde otro navegador, la sesión se corta. */
    public static function agent(): string
    {
        return hash('sha256', (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    }

    private static function hash(string $key): string
    {
        return hash('sha256', $key);
    }
}
