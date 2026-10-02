<?php

declare(strict_types=1);

final class Database
{
    public static function connect(): PDO
    {
        $config = self::config();
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['port'],
            $config['database']
        );

        return new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    /** @return array{host: string, port: int, database: string, username: string, password: string} */
    private static function config(): array
    {
        $file = dirname(__DIR__) . '/config.php';
        $stored = is_file($file) ? require $file : [];

        $password = getenv('DB_PASSWORD');

        return [
            'host' => self::env('DB_HOST', $stored['host'] ?? '127.0.0.1'),
            'port' => (int) self::env('DB_PORT', (string) ($stored['port'] ?? 3306)),
            'database' => self::env('DB_NAME', $stored['database'] ?? 'wicel'),
            'username' => self::env('DB_USER', $stored['username'] ?? 'root'),
            'password' => ($password === false || $password === '') ? (string) ($stored['password'] ?? '') : $password,
        ];
    }

    private static function env(string $key, string $fallback): string
    {
        $value = getenv($key);
        return $value === false || $value === '' ? $fallback : $value;
    }
}
