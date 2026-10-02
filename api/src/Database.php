<?php

declare(strict_types=1);

/** Opciones de api/config.php que no son de la base: emails, dirección del sitio y proxies. */
final class Config
{
    private static ?array $values = null;

    public static function get(string $key, mixed $default = null): mixed
    {
        if (self::$values === null) {
            $file = dirname(__DIR__) . '/config.php';
            $loaded = is_file($file) ? require $file : [];
            self::$values = is_array($loaded) ? $loaded : [];
        }

        return self::$values[$key] ?? $default;
    }
}

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
        $password = getenv('DB_PASSWORD');

        return [
            'host' => self::env('DB_HOST', (string) Config::get('host', '127.0.0.1')),
            'port' => (int) self::env('DB_PORT', (string) Config::get('port', 3306)),
            'database' => self::env('DB_NAME', (string) Config::get('database', 'wicel')),
            'username' => self::env('DB_USER', (string) Config::get('username', 'wicel_app')),
            'password' => ($password === false || $password === '') ? (string) Config::get('password', '') : $password,
        ];
    }

    private static function env(string $key, string $fallback): string
    {
        $value = getenv($key);
        return $value === false || $value === '' ? $fallback : $value;
    }
}
