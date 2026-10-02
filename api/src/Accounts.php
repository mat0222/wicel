<?php

declare(strict_types=1);

final class Accounts
{
    private const SELECT = <<<'SQL'
        SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role, u.created_at,
               COALESCE(la.points_balance, 0) AS points
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN customers c ON c.user_id = u.id
        LEFT JOIN loyalty_accounts la ON la.customer_id = c.id
        SQL;

    private const COMMON_PASSWORDS = [
        'password', 'password1', 'password123', 'contraseña', 'contrasena', 'contrasena1', '12345678a', 'qwerty123',
        'abc12345', 'abcd1234', 'a1234567', 'asdf1234', 'iloveyou1', 'bocajuniors1', 'riverplate1', 'argentina1', 'wicel123',
    ];

    /** Devuelve qué le falta a la contraseña, o null si sirve. */
    public static function passwordProblem(string $password, string $email): ?string
    {
        $user = strtolower(explode('@', $email)[0]);
        if (strlen($password) < 8 || strlen($password) > 200) {
            return 'La contraseña tiene que tener al menos 8 caracteres.';
        }
        if (!preg_match('/\pL/u', $password) || !preg_match('/\d/', $password)) {
            return 'La contraseña tiene que tener letras y números.';
        }
        if (in_array(strtolower($password), self::COMMON_PASSWORDS, true) || count(array_unique(mb_str_split(mb_strtolower($password)))) < 4) {
            return 'Esa contraseña es muy fácil de adivinar. Probá con otra.';
        }
        if (strlen($user) >= 4 && str_contains(strtolower($password), $user)) {
            return 'La contraseña no puede contener tu email.';
        }

        return null;
    }

    public static function emailTaken(PDO $pdo, string $email): bool
    {
        $stmt = $pdo->prepare('SELECT 1 FROM users WHERE email = ? OR username = ?');
        $stmt->execute([$email, $email]);

        return (bool) $stmt->fetchColumn();
    }

    public static function register(PDO $pdo, string $name, string $email, string $password): int
    {
        [$first, $last] = self::splitName($name);

        $pdo->beginTransaction();
        try {
            $role = $pdo->query("SELECT id FROM roles WHERE name = 'CLIENTE'")->fetchColumn();
            $pdo->prepare(
                'INSERT INTO users (role_id, username, email, password_hash, first_name, last_name)
                 VALUES (?, ?, ?, ?, ?, ?)'
            )->execute([$role, $email, $email, password_hash($password, PASSWORD_DEFAULT), $first, $last]);
            $userId = (int) $pdo->lastInsertId();

            $pdo->prepare('INSERT INTO customers (user_id, first_name, last_name, email) VALUES (?, ?, ?, ?)')
                ->execute([$userId, $first, $last, $email]);
            $pdo->prepare('INSERT INTO loyalty_accounts (customer_id) VALUES (?)')
                ->execute([(int) $pdo->lastInsertId()]);

            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        return $userId;
    }

    public static function verify(PDO $pdo, string $email, string $password): ?int
    {
        $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE (email = ? OR username = ?) AND is_active = 1');
        $stmt->execute([$email, $email]);
        $row = $stmt->fetch();

        if (!$row) {
            password_verify($password, '$2y$10$0000000000000000000000uM7a6tbQ1MrEBoJ2R3PZ7XoXYjaK9Ri');
            return null;
        }
        if (!password_verify($password, $row['password_hash'])) {
            return null;
        }

        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$row['id']]);

        return (int) $row['id'];
    }

    public static function find(PDO $pdo, int $id): ?array
    {
        $stmt = $pdo->prepare(self::SELECT . ' WHERE u.id = ? AND u.is_active = 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? self::shape($row) : null;
    }

    /** Cambia cuando cambia la contraseña: invalida las sesiones abiertas con la clave anterior. */
    public static function passwordStamp(PDO $pdo, int $id): string
    {
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? AND is_active = 1');
        $stmt->execute([$id]);
        $hash = $stmt->fetchColumn();

        return $hash ? substr(hash('sha256', (string) $hash), 0, 32) : '';
    }

    public static function all(PDO $pdo): array
    {
        $rows = $pdo->query(self::SELECT . ' WHERE u.is_active = 1 ORDER BY u.created_at DESC')->fetchAll();

        return array_map([self::class, 'shape'], $rows);
    }

    /** Devuelve el saldo nuevo, o null si el usuario no es cliente o quedaría en negativo. */
    public static function adjustPoints(PDO $pdo, int $userId, int $points, string $reason): ?int
    {
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT la.id, la.points_balance
                 FROM loyalty_accounts la
                 INNER JOIN customers c ON c.id = la.customer_id
                 WHERE c.user_id = ?
                 FOR UPDATE'
            );
            $stmt->execute([$userId]);
            $account = $stmt->fetch();

            $balance = $account ? (int) $account['points_balance'] + $points : -1;
            if ($balance < 0) {
                $pdo->rollBack();
                return null;
            }

            $pdo->prepare('UPDATE loyalty_accounts SET points_balance = ? WHERE id = ?')
                ->execute([$balance, $account['id']]);
            $pdo->prepare(
                'INSERT INTO loyalty_transactions (loyalty_account_id, type, points, description) VALUES (?, ?, ?, ?)'
            )->execute([$account['id'], $points > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', abs($points), $reason]);

            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        return $balance;
    }

    /** Crea el administrador o le cambia la contraseña si ya existe. */
    public static function saveAdmin(PDO $pdo, string $name, string $email, string $password): void
    {
        [$first, $last] = self::splitName($name);
        $role = $pdo->query("SELECT id FROM roles WHERE name = 'ADMINISTRADOR'")->fetchColumn();
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
        $stmt->execute([$email, $email]);
        $id = $stmt->fetchColumn();

        if ($id) {
            $pdo->prepare('UPDATE users SET role_id = ?, password_hash = ?, is_active = 1 WHERE id = ?')
                ->execute([$role, $hash, $id]);
            return;
        }

        $pdo->prepare(
            'INSERT INTO users (role_id, username, email, password_hash, first_name, last_name)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$role, $email, $email, $hash, $first, $last]);
    }

    private static function shape(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'email' => $row['email'],
            'role' => $row['role'] === 'ADMINISTRADOR' ? 'administrador' : 'cliente',
            'points' => (int) $row['points'],
            'createdAt' => $row['created_at'],
        ];
    }

    /** @return array{0: string, 1: string} */
    private static function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [''];

        return [limit_name($parts[0]), limit_name($parts[1] ?? '')];
    }
}

function limit_name(string $value): string
{
    return function_exists('mb_substr') ? mb_substr($value, 0, 100) : substr($value, 0, 100);
}
