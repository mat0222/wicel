<?php

declare(strict_types=1);

final class Legal
{
    /** Cambiar junto con LEGAL_VERSION en src/lib/legal.ts cada vez que cambian los textos legales. */
    public const VERSION = '2026-09-30';

    public const REQUEST_TYPES = [
        'ARREPENTIMIENTO' => ['prefix' => 'ARR', 'label' => 'Botón de arrepentimiento'],
        'GARANTIA' => ['prefix' => 'GAR', 'label' => 'Garantía por falla'],
        'CAMBIO' => ['prefix' => 'CAM', 'label' => 'Cambio comercial'],
        'CANCELACION' => ['prefix' => 'CAN', 'label' => 'Cancelación del pedido'],
    ];

    /** Si el artículo vendido lleva IMEI. Requiere los alias p (producto) y c (su categoría). */
    public const PHONE_ITEM_SQL = "CASE WHEN p.product_type = 'COMBO' THEN EXISTS (
            SELECT 1 FROM product_combo_items ci
            INNER JOIN product_variants cv ON cv.id = ci.variant_id
            INNER JOIN products cp ON cp.id = cv.product_id
            INNER JOIN categories cc ON cc.id = cp.category_id
            WHERE ci.combo_product_id = p.id AND cc.phone_specs = 1
        ) ELSE c.phone_specs = 1 END";

    public const REQUEST_STATUSES = [
        'RECEIVED' => 'Recibida',
        'ACCEPTED' => 'Aceptada',
        'RESOLVED' => 'Resuelta',
        'REJECTED' => 'Rechazada',
    ];

    public const CLAIM_STATUSES = [
        'RECEIVED' => 'Ingresado',
        'IN_REVIEW' => 'En diagnóstico',
        'REPAIRED' => 'Reparado',
        'REPLACED' => 'Reemplazado',
        'REJECTED' => 'Rechazado',
        'CLOSED' => 'Devuelto al cliente',
    ];

    public const SETTINGS = [
        'legal_name' => 150,
        'legal_cuit' => 20,
        'legal_tax_status' => 40,
        'vat_rate' => 6,
        'installments_rate' => 6,
        'installments_cftea' => 10,
        'warranty_extra' => 1000,
        'exchange_policy' => 1500,
    ];

    public static function setting(PDO $pdo, string $key): string
    {
        $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?');
        $stmt->execute([$key]);

        return trim((string) $stmt->fetchColumn());
    }

    public static function ip(): ?string
    {
        $ip = Security::ip();

        return $ip === 'sin-ip' ? null : substr($ip, 0, 45);
    }

    public static function event(PDO $pdo, int $saleId, string $type, string $detail, ?int $userId = null): void
    {
        $pdo->prepare('INSERT INTO order_events (sale_id, event_type, detail, user_id) VALUES (?, ?, ?, ?)')
            ->execute([$saleId, $type, limit_text($detail, 255), $userId]);
    }

    public static function audit(PDO $pdo, int $userId, string $action, string $entity, ?int $entityId = null, array $values = []): void
    {
        $pdo->prepare(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $userId, $action, $entity, $entityId ?: null,
            $values === [] ? null : json_encode($values, JSON_UNESCAPED_UNICODE),
            self::ip(), limit_text((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 500) ?: null,
        ]);
    }

    public static function auditLog(PDO $pdo): array
    {
        $rows = $pdo->query(
            "SELECT a.id, a.action, a.entity_type, a.entity_id, a.new_values, a.ip_address, a.created_at,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name
             FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
             ORDER BY a.created_at DESC, a.id DESC LIMIT 300"
        )->fetchAll();

        return array_map(static fn (array $row) => [
            'id' => (int) $row['id'],
            'action' => $row['action'],
            'entity' => $row['entity_type'],
            'entityId' => $row['entity_id'] === null ? null : (int) $row['entity_id'],
            'detail' => $row['new_values'] === null ? '' : (string) $row['new_values'],
            'ip' => $row['ip_address'],
            'user' => $row['user_name'] ?: 'Sin usuario',
            'date' => $row['created_at'],
        ], $rows);
    }

    private static function findSale(PDO $pdo, string $number, string $email): ?array
    {
        $number = strtoupper(trim($number));
        if (preg_match('/^\d{1,9}$/', $number)) {
            $number = sprintf('WI-%05d', (int) $number);
        }
        $stmt = $pdo->prepare('SELECT * FROM sales WHERE sale_number = ? AND LOWER(customer_email_snapshot) = ?');
        $stmt->execute([$number, strtolower(trim($email))]);

        return $stmt->fetch() ?: null;
    }

    private static function deliveredAt(PDO $pdo, int $saleId): ?string
    {
        $stmt = $pdo->prepare("SELECT MAX(created_at) FROM order_events WHERE sale_id = ? AND event_type = 'STATUS_DELIVERED'");
        $stmt->execute([$saleId]);

        return $stmt->fetchColumn() ?: null;
    }

    /** Detalle del pedido para el cliente que da su número y su email. */
    public static function lookup(PDO $pdo, string $number, string $email): ?array
    {
        $sale = self::findSale($pdo, $number, $email);
        if ($sale === null) {
            return null;
        }
        $id = (int) $sale['id'];

        $items = $pdo->prepare('SELECT product_name_snapshot, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ? ORDER BY id');
        $items->execute([$id]);
        $events = $pdo->prepare('SELECT detail, created_at FROM order_events WHERE sale_id = ? ORDER BY created_at, id');
        $events->execute([$id]);
        $requests = $pdo->prepare('SELECT code, request_type, status, created_at FROM after_sales_requests WHERE sale_id = ? ORDER BY id');
        $requests->execute([$id]);

        return [
            'number' => $sale['sale_number'],
            'date' => $sale['sold_at'],
            'status' => $sale['status'],
            'statusLabel' => Orders::STATUSES[$sale['status']] ?? $sale['status'],
            'customer' => $sale['customer_name_snapshot'],
            'delivery' => $sale['delivery_method'],
            'address' => $sale['shipping_address_snapshot'],
            'payment' => preg_replace('/^Pago elegido: /', '', (string) $sale['notes']),
            'total' => (int) round((float) $sale['total']),
            'termsVersion' => $sale['terms_version'],
            'termsAcceptedAt' => $sale['terms_accepted_at'],
            'snapshot' => $sale['order_snapshot'] === null ? null : json_decode((string) $sale['order_snapshot'], true),
            'items' => array_map(static fn (array $row) => [
                'name' => $row['product_name_snapshot'],
                'qty' => (int) $row['quantity'],
                'unitPrice' => (int) round((float) $row['unit_price']),
                'subtotal' => (int) round((float) $row['subtotal']),
            ], $items->fetchAll()),
            'events' => array_map(static fn (array $row) => ['detail' => $row['detail'], 'date' => $row['created_at']], $events->fetchAll()),
            'requests' => array_map(static fn (array $row) => [
                'code' => $row['code'],
                'type' => self::REQUEST_TYPES[$row['request_type']]['label'],
                'status' => self::REQUEST_STATUSES[$row['status']],
                'date' => $row['created_at'],
            ], $requests->fetchAll()),
        ];
    }

    /** Registra un pedido de arrepentimiento, garantía, cambio o cancelación. */
    public static function createRequest(PDO $pdo, array $payload): array|string
    {
        $type = strtoupper((string) ($payload['type'] ?? ''));
        $number = (string) ($payload['number'] ?? '');
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $phone = trim((string) ($payload['phone'] ?? ''));
        $reason = trim((string) ($payload['reason'] ?? ''));

        if (!isset(self::REQUEST_TYPES[$type])) {
            return 'Elegí qué necesitás hacer con tu compra.';
        }
        if ($type === 'CAMBIO' && self::setting($pdo, 'exchange_policy') === '') {
            return 'Por ahora no ofrecemos cambios comerciales por la web. Escribinos por WhatsApp.';
        }
        if (trim($number) === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return 'Escribí el número de pedido y el email con el que compraste.';
        }
        if ($type === 'GARANTIA' && $reason === '') {
            return 'Contanos qué falla tiene el equipo.';
        }

        $sale = self::findSale($pdo, $number, $email);
        if ($sale === null) {
            return 'No encontramos un pedido con ese número y ese email. Revisá los datos o escribinos por WhatsApp.';
        }
        $saleId = (int) $sale['id'];
        if ($sale['status'] === 'CANCELLED' && in_array($type, ['ARREPENTIMIENTO', 'CANCELACION'], true)) {
            return "El pedido {$sale['sale_number']} ya está cancelado.";
        }

        $open = $pdo->prepare("SELECT code, created_at FROM after_sales_requests WHERE sale_id = ? AND request_type = ? AND status IN ('RECEIVED', 'ACCEPTED') LIMIT 1");
        $open->execute([$saleId, $type]);
        if ($row = $open->fetch()) {
            return ['code' => $row['code'], 'type' => self::REQUEST_TYPES[$type]['label'], 'number' => $sale['sale_number'], 'date' => $row['created_at'], 'existing' => true];
        }

        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = self::REQUEST_TYPES[$type]['prefix'] . '-';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $taken = $pdo->prepare('SELECT 1 FROM after_sales_requests WHERE code = ?');
            $taken->execute([$code]);
        } while ($taken->fetchColumn());

        $pdo->prepare(
            "INSERT INTO after_sales_requests (code, request_type, sale_id, customer_name, email, phone, reason, channel, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'WEB', ?)"
        )->execute([
            $code, $type, $saleId, (string) $sale['customer_name_snapshot'], $email,
            $phone === '' ? $sale['customer_phone_snapshot'] : limit_text($phone, 30),
            $reason === '' ? null : limit_text($reason, 2000), self::ip(),
        ]);
        self::event($pdo, $saleId, 'REQUEST', self::REQUEST_TYPES[$type]['label'] . ": solicitud $code recibida");

        return [
            'code' => $code,
            'type' => self::REQUEST_TYPES[$type]['label'],
            'number' => $sale['sale_number'],
            'date' => (string) $pdo->query('SELECT NOW()')->fetchColumn(),
            'existing' => false,
        ];
    }

    public static function requests(PDO $pdo): array
    {
        $rows = $pdo->query(
            "SELECT r.*, s.sale_number, s.sold_at, s.status AS sale_status,
                    (SELECT MAX(e.created_at) FROM order_events e WHERE e.sale_id = s.id AND e.event_type = 'STATUS_DELIVERED') AS delivered_at
             FROM after_sales_requests r INNER JOIN sales s ON s.id = r.sale_id
             ORDER BY r.created_at DESC, r.id DESC LIMIT 500"
        )->fetchAll();

        return array_map(static fn (array $row) => [
            'id' => (int) $row['id'],
            'code' => $row['code'],
            'type' => $row['request_type'],
            'typeLabel' => self::REQUEST_TYPES[$row['request_type']]['label'],
            'number' => $row['sale_number'],
            'saleStatus' => Orders::STATUSES[$row['sale_status']] ?? $row['sale_status'],
            'soldAt' => $row['sold_at'],
            'deliveredAt' => $row['delivered_at'],
            'customer' => $row['customer_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'reason' => $row['reason'],
            'status' => $row['status'],
            'note' => $row['admin_note'],
            'date' => $row['created_at'],
        ], $rows);
    }

    public static function setRequestStatus(PDO $pdo, int $id, string $status, string $note, int $userId): ?string
    {
        if (!isset(self::REQUEST_STATUSES[$status])) {
            return 'Ese estado no existe.';
        }
        $stmt = $pdo->prepare('SELECT sale_id, code FROM after_sales_requests WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            return 'No encontramos esa solicitud.';
        }
        $pdo->prepare(
            "UPDATE after_sales_requests SET status = ?, admin_note = COALESCE(NULLIF(?, ''), admin_note),
                    resolved_at = IF(? IN ('RESOLVED', 'REJECTED'), COALESCE(resolved_at, NOW()), NULL)
             WHERE id = ?"
        )->execute([$status, limit_text($note, 500), $status, $id]);
        self::event($pdo, (int) $row['sale_id'], 'REQUEST_STATUS', "Solicitud {$row['code']}: " . self::REQUEST_STATUSES[$status], $userId);

        return null;
    }

    private static function luhn(string $digits): bool
    {
        $sum = 0;
        foreach (str_split(strrev($digits)) as $i => $digit) {
            $value = (int) $digit * ($i % 2 === 1 ? 2 : 1);
            $sum += $value > 9 ? $value - 9 : $value;
        }

        return $sum % 10 === 0;
    }

    /** Asocia un IMEI a un producto vendido y abre su garantía legal. */
    public static function registerDevice(PDO $pdo, int $saleItemId, string $imei, string $serial): ?string
    {
        $imei = (string) preg_replace('/\D/', '', $imei);
        if (strlen($imei) !== 15 || !self::luhn($imei)) {
            return 'El IMEI tiene que tener 15 números. Revisalo marcando *#06# en el celular.';
        }

        $stmt = $pdo->prepare(
            "SELECT si.id, si.sale_id, si.variant_id, si.quantity, s.status, v.condition_type,
                    (SELECT COUNT(*) FROM sale_item_devices d WHERE d.sale_item_id = si.id) AS devices,
                    " . self::PHONE_ITEM_SQL . " AS phone
             FROM sale_items si
             INNER JOIN sales s ON s.id = si.sale_id
             INNER JOIN product_variants v ON v.id = si.variant_id
             INNER JOIN products p ON p.id = v.product_id
             INNER JOIN categories c ON c.id = p.category_id
             WHERE si.id = ?"
        );
        $stmt->execute([$saleItemId]);
        $item = $stmt->fetch();
        if (!$item) {
            return 'No encontramos ese producto vendido.';
        }
        if (!$item['phone']) {
            return 'Este producto no lleva IMEI. Su garantía legal corre desde la entrega.';
        }
        if ($item['status'] === 'CANCELLED') {
            return 'El pedido está cancelado.';
        }
        if ((int) $item['devices'] >= (int) $item['quantity']) {
            return 'Ya cargaste todos los IMEI de este producto.';
        }
        $taken = $pdo->prepare('SELECT 1 FROM imei_devices WHERE imei = ? OR imei2 = ?');
        $taken->execute([$imei, $imei]);
        if ($taken->fetchColumn()) {
            return 'Ese IMEI ya está cargado en otra venta.';
        }
        $serial = trim($serial);
        if ($serial !== '') {
            $taken = $pdo->prepare('SELECT 1 FROM imei_devices WHERE serial_number = ?');
            $taken->execute([$serial]);
            if ($taken->fetchColumn()) {
                return 'Ese número de serie ya está cargado en otra venta.';
            }
        }

        $months = $item['condition_type'] === 'NEW' ? 6 : 3;
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO imei_devices (variant_id, imei, serial_number, status, sale_id) VALUES (?, ?, ?, 'SOLD', ?)")
                ->execute([$item['variant_id'], $imei, $serial === '' ? null : limit_text($serial, 100), $item['sale_id']]);
            $deviceId = (int) $pdo->lastInsertId();
            $pdo->prepare('INSERT INTO sale_item_devices (sale_item_id, imei_device_id) VALUES (?, ?)')->execute([$saleItemId, $deviceId]);
            $pdo->prepare(
                "INSERT INTO warranties (sale_id, sale_item_id, imei_device_id, warranty_number, start_date, end_date, status, notes)
                 VALUES (?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL $months MONTH), 'ACTIVE', ?)"
            )->execute([$item['sale_id'], $saleItemId, $deviceId, 'TMP-' . bin2hex(random_bytes(8)), "Garantía legal de $months meses (Ley 24.240, art. 11)"]);
            $warrantyId = (int) $pdo->lastInsertId();
            $number = sprintf('GT-%05d', $warrantyId);
            $pdo->prepare('UPDATE warranties SET warranty_number = ? WHERE id = ?')->execute([$number, $warrantyId]);
            self::event($pdo, (int) $item['sale_id'], 'WARRANTY', "Garantía $number abierta para el IMEI $imei ($months meses)");
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        return null;
    }

    public static function warranties(PDO $pdo): array
    {
        $rows = $pdo->query(
            "SELECT w.id, w.warranty_number, w.start_date, w.end_date, w.status, w.notes, s.sale_number,
                    s.customer_name_snapshot, s.customer_phone_snapshot, si.product_name_snapshot, d.imei, d.serial_number,
                    w.end_date < CURDATE() AS expired
             FROM warranties w
             INNER JOIN sales s ON s.id = w.sale_id
             LEFT JOIN sale_items si ON si.id = w.sale_item_id
             LEFT JOIN imei_devices d ON d.id = w.imei_device_id
             ORDER BY w.id DESC LIMIT 500"
        )->fetchAll();
        $claims = [];
        foreach ($pdo->query('SELECT * FROM warranty_claims ORDER BY id')->fetchAll() as $claim) {
            $claims[(int) $claim['warranty_id']][] = [
                'id' => (int) $claim['id'],
                'number' => $claim['claim_number'],
                'issue' => $claim['issue_description'],
                'diagnosis' => $claim['diagnosis'] ?? '',
                'resolution' => $claim['resolution'] ?? '',
                'status' => $claim['status'],
                'receivedAt' => $claim['received_at'],
                'resolvedAt' => $claim['resolved_at'],
            ];
        }

        return array_map(static fn (array $row) => [
            'id' => (int) $row['id'],
            'number' => $row['warranty_number'],
            'saleNumber' => $row['sale_number'],
            'customer' => $row['customer_name_snapshot'],
            'phone' => $row['customer_phone_snapshot'],
            'product' => $row['product_name_snapshot'],
            'imei' => $row['imei'],
            'serial' => $row['serial_number'],
            'start' => $row['start_date'],
            'end' => $row['end_date'],
            'expired' => (bool) $row['expired'],
            'claimed' => $row['status'] === 'CLAIMED',
            'notes' => $row['notes'],
            'claims' => $claims[(int) $row['id']] ?? [],
        ], $rows);
    }

    public static function openClaim(PDO $pdo, int $warrantyId, string $issue, int $userId): ?string
    {
        $issue = trim($issue);
        if ($issue === '') {
            return 'Contá qué falla tiene el equipo.';
        }
        $stmt = $pdo->prepare('SELECT w.id, w.sale_id, w.warranty_number, s.customer_id FROM warranties w INNER JOIN sales s ON s.id = w.sale_id WHERE w.id = ?');
        $stmt->execute([$warrantyId]);
        $warranty = $stmt->fetch();
        if (!$warranty) {
            return 'No encontramos esa garantía.';
        }
        $pdo->prepare(
            "INSERT INTO warranty_claims (warranty_id, customer_id, assigned_user_id, claim_number, issue_description, status)
             VALUES (?, ?, ?, ?, ?, 'RECEIVED')"
        )->execute([$warrantyId, $warranty['customer_id'], $userId, 'TMP-' . bin2hex(random_bytes(8)), limit_text($issue, 2000)]);
        $claimId = (int) $pdo->lastInsertId();
        $number = sprintf('RG-%05d', $claimId);
        $pdo->prepare('UPDATE warranty_claims SET claim_number = ? WHERE id = ?')->execute([$number, $claimId]);
        $pdo->prepare("UPDATE warranties SET status = 'CLAIMED' WHERE id = ?")->execute([$warrantyId]);
        self::event($pdo, (int) $warranty['sale_id'], 'WARRANTY', "Reclamo $number ingresado por la garantía {$warranty['warranty_number']}", $userId);

        return null;
    }

    /** Actualiza un reclamo. El tiempo que el equipo estuvo en reparación se suma a la garantía (Ley 24.240, art. 16). */
    public static function setClaim(PDO $pdo, int $id, string $status, string $diagnosis, string $resolution, int $userId): ?string
    {
        if (!isset(self::CLAIM_STATUSES[$status])) {
            return 'Ese estado no existe.';
        }
        $stmt = $pdo->prepare('SELECT c.*, w.sale_id FROM warranty_claims c INNER JOIN warranties w ON w.id = c.warranty_id WHERE c.id = ?');
        $stmt->execute([$id]);
        $claim = $stmt->fetch();
        if (!$claim) {
            return 'No encontramos ese reclamo.';
        }

        $finished = in_array($status, ['REPAIRED', 'REPLACED', 'REJECTED', 'CLOSED'], true);
        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE warranty_claims SET status = ?, diagnosis = ?, resolution = ?, resolved_at = ? WHERE id = ?')->execute([
                $status, trim($diagnosis) === '' ? null : limit_text(trim($diagnosis), 2000), trim($resolution) === '' ? null : limit_text(trim($resolution), 2000),
                $finished ? ($claim['resolved_at'] ?? $pdo->query('SELECT NOW()')->fetchColumn()) : null, $id,
            ]);
            if ($finished && $claim['resolved_at'] === null && $status !== 'REJECTED') {
                $pdo->prepare('UPDATE warranties SET end_date = DATE_ADD(end_date, INTERVAL GREATEST(DATEDIFF(NOW(), ?), 0) DAY) WHERE id = ?')
                    ->execute([$claim['received_at'], $claim['warranty_id']]);
            }
            if (in_array($status, ['CLOSED', 'REJECTED'], true)) {
                $pdo->prepare("UPDATE warranties SET status = 'ACTIVE' WHERE id = ?")->execute([$claim['warranty_id']]);
            }
            self::event($pdo, (int) $claim['sale_id'], 'WARRANTY', "Reclamo {$claim['claim_number']}: " . self::CLAIM_STATUSES[$status], $userId);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        return null;
    }
}
