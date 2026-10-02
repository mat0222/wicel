<?php

declare(strict_types=1);

final class Rewards
{
    public const STATUSES = [
        'PENDING' => 'Para retirar',
        'DELIVERED' => 'Entregado',
        'CANCELLED' => 'Cancelado',
    ];

    public static function list(PDO $pdo, bool $all = false): array
    {
        $rows = $pdo->query(
            'SELECT id, name, description, image_url, points_cost, stock, is_active
             FROM rewards ' . ($all ? '' : 'WHERE is_active = 1 ') . '
             ORDER BY is_active DESC, points_cost ASC, name ASC'
        )->fetchAll();

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'description' => (string) $row['description'],
            'image' => $row['image_url'],
            'points' => (int) $row['points_cost'],
            'stock' => (int) $row['stock'],
            'active' => (bool) $row['is_active'],
        ], $rows);
    }

    /** Devuelve el id guardado, o un mensaje de error. */
    public static function save(PDO $pdo, array $data, ?array $photo): int|string
    {
        $id = (int) ($data['id'] ?? 0);
        $name = trim((string) ($data['name'] ?? ''));
        $points = (int) ($data['points'] ?? 0);
        $stock = (int) ($data['stock'] ?? -1);

        if ($name === '') {
            return 'Escribí el nombre del premio.';
        }
        if ($points <= 0) {
            return 'Escribí cuántos puntos cuesta el premio.';
        }
        if ($stock < 0) {
            return 'Escribí cuántas unidades tenés para canjear (puede ser 0).';
        }

        $image = null;
        if ($photo !== null && ($photo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $image = Catalog::storePhoto($photo);
            if (!str_starts_with($image, '/api/uploads/')) {
                return $image;
            }
        }

        $values = [limit_text($name, 150), trim((string) ($data['description'] ?? '')), $points, $stock];
        if ($id > 0) {
            $sql = 'UPDATE rewards SET name = ?, description = ?, points_cost = ?, stock = ?' . ($image ? ', image_url = ?' : '') . ' WHERE id = ?';
            $pdo->prepare($sql)->execute([...$values, ...($image ? [$image] : []), $id]);

            return $id;
        }

        $pdo->prepare('INSERT INTO rewards (name, description, points_cost, stock, image_url) VALUES (?, ?, ?, ?, ?)')
            ->execute([...$values, $image]);

        return (int) $pdo->lastInsertId();
    }

    public static function setActive(PDO $pdo, int $id, bool $active): void
    {
        $pdo->prepare('UPDATE rewards SET is_active = ? WHERE id = ?')->execute([$active ? 1 : 0, $id]);
    }

    /** Descuenta los puntos y reserva el premio. Devuelve el canje, o un mensaje de error. */
    public static function redeem(PDO $pdo, int $userId, int $rewardId, string $phone): array|string
    {
        if (strlen(preg_replace('/\D/', '', $phone) ?? '') < 8) {
            return 'Dejanos tu WhatsApp para coordinar la entrega del premio.';
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'SELECT la.id, la.points_balance, c.id AS customer_id
                 FROM loyalty_accounts la
                 INNER JOIN customers c ON c.id = la.customer_id
                 WHERE c.user_id = ?
                 FOR UPDATE'
            );
            $stmt->execute([$userId]);
            $account = $stmt->fetch();
            if (!$account) {
                $pdo->rollBack();
                return 'Solo los clientes registrados pueden canjear puntos.';
            }

            $stmt = $pdo->prepare('SELECT id, name, points_cost, stock FROM rewards WHERE id = ? AND is_active = 1 FOR UPDATE');
            $stmt->execute([$rewardId]);
            $reward = $stmt->fetch();
            if (!$reward) {
                $pdo->rollBack();
                return 'Ese premio ya no está disponible.';
            }
            if ((int) $reward['stock'] <= 0) {
                $pdo->rollBack();
                return 'Se agotó ese premio. Elegí otro o esperá a que repongamos.';
            }

            $cost = (int) $reward['points_cost'];
            $balance = (int) $account['points_balance'];
            if ($balance < $cost) {
                $pdo->rollBack();
                return 'Te faltan ' . ($cost - $balance) . ' puntos para este premio.';
            }

            $pdo->prepare('UPDATE loyalty_accounts SET points_balance = points_balance - ? WHERE id = ?')->execute([$cost, $account['id']]);
            $pdo->prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ?')->execute([$reward['id']]);
            $pdo->prepare('UPDATE customers SET phone = ? WHERE id = ?')->execute([limit_text(trim($phone), 30), $account['customer_id']]);
            $pdo->prepare(
                'INSERT INTO reward_redemptions (reward_id, customer_id, reward_name_snapshot, points) VALUES (?, ?, ?, ?)'
            )->execute([$reward['id'], $account['customer_id'], $reward['name'], $cost]);
            $redemptionId = (int) $pdo->lastInsertId();
            $code = sprintf('CJ-%05d', $redemptionId);
            $pdo->prepare('UPDATE reward_redemptions SET code = ? WHERE id = ?')->execute([$code, $redemptionId]);
            $pdo->prepare("INSERT INTO loyalty_transactions (loyalty_account_id, type, points, description) VALUES (?, 'REDEEM', ?, ?)")
                ->execute([$account['id'], $cost, "Canje {$code}: {$reward['name']}"]);

            $pdo->commit();

            return ['code' => $code, 'reward' => $reward['name'], 'points' => $cost, 'balance' => $balance - $cost];
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }
    }

    public static function forUser(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare(self::SELECT . ' WHERE c.user_id = ? ORDER BY r.created_at DESC');
        $stmt->execute([$userId]);

        return array_map([self::class, 'shape'], $stmt->fetchAll());
    }

    public static function redemptions(PDO $pdo): array
    {
        return array_map([self::class, 'shape'], $pdo->query(self::SELECT . ' ORDER BY r.created_at DESC LIMIT 300')->fetchAll());
    }

    /** Cancelar devuelve los puntos al cliente y la unidad al stock de premios. */
    public static function setStatus(PDO $pdo, int $id, string $status): ?string
    {
        if (!isset(self::STATUSES[$status])) {
            return 'Elegí un estado válido.';
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT id, code, reward_id, customer_id, points, status FROM reward_redemptions WHERE id = ? FOR UPDATE');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                $pdo->rollBack();
                return 'No encontramos ese canje.';
            }
            if ($row['status'] === 'CANCELLED') {
                $pdo->rollBack();
                return 'Ese canje ya está cancelado.';
            }

            if ($status === 'CANCELLED') {
                $pdo->prepare('UPDATE loyalty_accounts SET points_balance = points_balance + ? WHERE customer_id = ?')
                    ->execute([$row['points'], $row['customer_id']]);
                $pdo->prepare('UPDATE rewards SET stock = stock + 1 WHERE id = ?')->execute([$row['reward_id']]);
                $pdo->prepare(
                    "INSERT INTO loyalty_transactions (loyalty_account_id, type, points, description)
                     SELECT id, 'ADJUSTMENT_IN', ?, ? FROM loyalty_accounts WHERE customer_id = ?"
                )->execute([$row['points'], "Canje {$row['code']} cancelado", $row['customer_id']]);
            }

            $pdo->prepare('UPDATE reward_redemptions SET status = ? WHERE id = ?')->execute([$status, $id]);
            $pdo->commit();

            return null;
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }
    }

    private const SELECT = 'SELECT r.id, r.code, r.reward_name_snapshot, r.points, r.status, r.created_at,
                                   CONCAT_WS(\' \', c.first_name, c.last_name) AS customer, c.email, c.phone,
                                   w.image_url
                            FROM reward_redemptions r
                            INNER JOIN customers c ON c.id = r.customer_id
                            INNER JOIN rewards w ON w.id = r.reward_id';

    private static function shape(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'code' => $row['code'],
            'reward' => $row['reward_name_snapshot'],
            'image' => $row['image_url'],
            'points' => (int) $row['points'],
            'status' => $row['status'],
            'statusLabel' => self::STATUSES[$row['status']],
            'customer' => trim($row['customer']),
            'email' => $row['email'],
            'phone' => (string) $row['phone'],
            'date' => $row['created_at'],
        ];
    }
}
