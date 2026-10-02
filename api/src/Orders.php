<?php

declare(strict_types=1);

final class Orders
{
    public const CASH_OFF = 0.10;
    public const INSTALLMENTS = 12;

    private const PAYMENTS = [
        'tarjeta-1' => ['code' => 'CREDIT_CARD', 'label' => 'Tarjeta en 1 pago', 'installments' => 1],
        'tarjeta-12' => ['code' => 'CREDIT_CARD', 'label' => 'Tarjeta en 12 cuotas', 'installments' => self::INSTALLMENTS],
        'transferencia' => ['code' => 'TRANSFER', 'label' => 'Transferencia', 'installments' => 1],
        'efectivo' => ['code' => 'CASH', 'label' => 'Efectivo en el local', 'installments' => 1],
    ];

    public const STATUSES = [
        'PENDING' => 'Pendiente de pago',
        'PAID' => 'Pagado',
        'SHIPPED' => 'Enviado',
        'DELIVERED' => 'Entregado',
        'CANCELLED' => 'Cancelado',
    ];

    private const EARNING = ['PAID', 'SHIPPED', 'DELIVERED'];

    public static function pointsFor(PDO $pdo, int $total): int
    {
        $rate = (int) $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'points_per_currency'")->fetchColumn();

        return intdiv(max(0, $total), 1000) * max(1, $rate);
    }

    /** Las cuotas solo se ofrecen con el recargo y el CFTEA cargados en el panel. */
    public static function financing(PDO $pdo): ?array
    {
        $rate = str_replace(',', '.', Legal::setting($pdo, 'installments_rate'));
        $cftea = Legal::setting($pdo, 'installments_cftea');
        if ($cftea === '' || !is_numeric($rate)) {
            return null;
        }

        return ['rate' => (float) $rate / 100, 'cftea' => $cftea];
    }

    /**
     * Guarda un pedido de la tienda. Devuelve el pedido o un texto con el problema.
     * @param array{id: int}|null $account cuenta de cliente con sesión iniciada
     */
    public static function create(PDO $pdo, array $payload, ?array $account): array|string
    {
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
        $payment = (string) ($payload['payment'] ?? '');
        $first = trim((string) ($payload['firstName'] ?? ''));
        $last = trim((string) ($payload['lastName'] ?? ''));
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $phone = trim((string) ($payload['phone'] ?? ''));
        $address = trim((string) ($payload['address'] ?? ''));
        $delivery = in_array($payload['delivery'] ?? '', ['PICKUP', 'SHIPPING'], true) ? $payload['delivery'] : '';
        $financing = self::financing($pdo);

        if ($items === [] || count($items) > 20) {
            return 'Tu carrito está vacío.';
        }
        if (!isset(self::PAYMENTS[$payment])) {
            return 'Elegí cómo vas a pagar.';
        }
        if ($payment === 'tarjeta-12' && $financing === null) {
            return 'Las cuotas no están disponibles por ahora. Elegí otra forma de pago.';
        }
        if ($delivery === '') {
            return 'Elegí si retirás en el local o querés envío a domicilio.';
        }
        if ($payment === 'efectivo' && $delivery === 'SHIPPING') {
            return 'El pago en efectivo es solo retirando en el local.';
        }
        if ($first === '' || $last === '') {
            return 'Completá nombre y apellido.';
        }
        if ($delivery === 'SHIPPING' && $address === '') {
            return 'Escribí la dirección de entrega.';
        }
        if ($delivery === 'PICKUP') {
            $address = 'Retiro en el local';
        }
        if (($payload['acceptTerms'] ?? false) !== true) {
            return 'Para confirmar tenés que aceptar los Términos y condiciones y la Política de privacidad.';
        }
        if (($payload['termsVersion'] ?? '') !== Legal::VERSION) {
            return 'Actualizamos los términos de compra. Recargá la página para leer la versión nueva.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return 'Revisá que el email esté bien escrito.';
        }
        if (strlen((string) preg_replace('/\D/', '', $phone)) < 8) {
            return 'Revisá el WhatsApp, con código de área.';
        }

        $wanted = [];
        foreach ($items as $item) {
            $variant = (int) ($item['variantId'] ?? 0);
            $qty = (int) ($item['qty'] ?? 0);
            if ($variant <= 0 || $qty < 1 || $qty > 10) {
                return 'Revisá las cantidades del carrito.';
            }
            $wanted[$variant] = ($wanted[$variant] ?? 0) + $qty;
        }

        $warehouse = Catalog::warehouse($pdo);
        $pdo->beginTransaction();
        try {
            $lines = [];
            $needs = [];
            foreach ($wanted as $variantId => $qty) {
                $stmt = $pdo->prepare(
                    'SELECT v.id, v.sku, v.sale_price, p.name, p.product_type, col.name AS color
                     FROM product_variants v
                     INNER JOIN products p ON p.id = v.product_id AND p.is_active = 1
                     LEFT JOIN colors col ON col.id = v.color_id
                     WHERE v.id = ? AND v.is_active = 1'
                );
                $stmt->execute([$variantId]);
                $row = $stmt->fetch();
                if (!$row) {
                    $pdo->rollBack();
                    return 'Uno de los productos del carrito ya no está a la venta. Sacalo y probá de nuevo.';
                }
                $label = $row['name'] . ($row['color'] ? ' · ' . $row['color'] : '');
                $lines[] = ['variant' => $variantId, 'sku' => $row['sku'], 'name' => $label, 'qty' => $qty, 'price' => (int) round((float) $row['sale_price'])];

                if ($row['product_type'] === 'COMBO') {
                    $parts = $pdo->prepare('SELECT variant_id, quantity FROM product_combo_items WHERE combo_product_id = (SELECT product_id FROM product_variants WHERE id = ?)');
                    $parts->execute([$variantId]);
                    foreach ($parts->fetchAll() as $part) {
                        $needs[(int) $part['variant_id']] = ['qty' => ($needs[(int) $part['variant_id']]['qty'] ?? 0) + $qty * (int) $part['quantity'], 'name' => $label];
                    }
                } else {
                    $needs[$variantId] = ['qty' => ($needs[$variantId]['qty'] ?? 0) + $qty, 'name' => $label];
                }
            }

            ksort($needs);
            foreach ($needs as $variantId => $need) {
                $stmt = $pdo->prepare('SELECT quantity FROM inventory_stock WHERE warehouse_id = ? AND variant_id = ? FOR UPDATE');
                $stmt->execute([$warehouse, $variantId]);
                $have = (int) $stmt->fetchColumn();
                if ($have < $need['qty']) {
                    $pdo->rollBack();
                    return $have === 0
                        ? "{$need['name']} se quedó sin stock. Sacalo del carrito para seguir."
                        : "De {$need['name']} quedan {$have}. Bajá la cantidad para seguir.";
                }
            }

            $list = array_sum(array_map(static fn ($line) => $line['price'] * $line['qty'], $lines));
            $method = self::PAYMENTS[$payment];
            $total = match ($payment) {
                'tarjeta-1' => $list,
                'tarjeta-12' => (int) round($list * (1 + $financing['rate'])),
                default => (int) round($list * (1 - self::CASH_OFF)),
            };
            $discount = max(0, $list - $total);
            $installment = $method['installments'] > 1 ? (int) round($total / $method['installments']) : null;
            $notes = 'Pago elegido: ' . $method['label'] . ($installment ? " ({$method['installments']} cuotas de \${$installment}, CFTEA {$financing['cftea']}%)" : '');
            $snapshot = [
                'items' => array_map(static fn ($line) => ['name' => $line['name'], 'sku' => $line['sku'], 'qty' => $line['qty'], 'unitPrice' => $line['price'], 'subtotal' => $line['price'] * $line['qty']], $lines),
                'listTotal' => $list,
                'payment' => $method['label'],
                'adjustment' => $total - $list,
                'installments' => $method['installments'],
                'installmentAmount' => $installment,
                'financeRate' => $payment === 'tarjeta-12' ? $financing['rate'] * 100 : null,
                'cftea' => $payment === 'tarjeta-12' ? $financing['cftea'] : null,
                'total' => $total,
                'delivery' => $delivery === 'PICKUP' ? 'Retiro en el local' : 'Envío a domicilio',
                'shipping' => $delivery === 'SHIPPING' ? 'Costo y plazo de envío a coordinar antes del pago' : null,
                'termsVersion' => Legal::VERSION,
            ];

            $customerId = null;
            if ($account !== null) {
                $stmt = $pdo->prepare('SELECT id FROM customers WHERE user_id = ?');
                $stmt->execute([$account['id']]);
                $customerId = $stmt->fetchColumn() ?: null;
                if ($customerId) {
                    $pdo->prepare("UPDATE customers SET phone = COALESCE(NULLIF(phone, ''), ?) WHERE id = ?")->execute([limit_text($phone, 30), $customerId]);
                }
            }

            $pdo->prepare(
                "INSERT INTO sales (customer_id, warehouse_id, sale_number, sale_channel, status, customer_name_snapshot,
                                    customer_email_snapshot, customer_phone_snapshot, shipping_address_snapshot, delivery_method,
                                    subtotal, discount, total, notes, terms_version, terms_accepted_at, accepted_ip, order_snapshot)
                 VALUES (?, ?, ?, 'WEBSITE', 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)"
            )->execute([
                $customerId, $warehouse, 'TMP-' . bin2hex(random_bytes(8)),
                limit_text("$first $last", 200), limit_text($email, 150), limit_text($phone, 30), $address, $delivery,
                $list, $discount, $total, $notes, Legal::VERSION, Legal::ip(), json_encode($snapshot, JSON_UNESCAPED_UNICODE),
            ]);
            $saleId = (int) $pdo->lastInsertId();
            $number = sprintf('WI-%05d', $saleId);
            $pdo->prepare('UPDATE sales SET sale_number = ? WHERE id = ?')->execute([$number, $saleId]);
            Legal::event($pdo, $saleId, 'CREATED', 'Pedido recibido por la web. Aceptó los términos versión ' . Legal::VERSION);
            if (($payload['marketing'] ?? false) === true) {
                $pdo->prepare(
                    "INSERT INTO customer_consents (customer_id, sale_id, email, consent_type, granted, source, text_version, ip_address)
                     VALUES (?, ?, ?, 'MARKETING', 1, 'CHECKOUT', ?, ?)"
                )->execute([$customerId, $saleId, limit_text($email, 150), Legal::VERSION, Legal::ip()]);
            }

            foreach ($lines as $line) {
                $pdo->prepare(
                    'INSERT INTO sale_items (sale_id, variant_id, product_name_snapshot, sku_snapshot, quantity, unit_price, subtotal)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                )->execute([$saleId, $line['variant'], limit_text($line['name'], 180), $line['sku'], $line['qty'], $line['price'], $line['price'] * $line['qty']]);
            }

            foreach ($needs as $variantId => $need) {
                $pdo->prepare('UPDATE inventory_stock SET quantity = quantity - ? WHERE warehouse_id = ? AND variant_id = ?')
                    ->execute([$need['qty'], $warehouse, $variantId]);
                $pdo->prepare(
                    "INSERT INTO stock_movements (warehouse_id, variant_id, movement_type, quantity, reference_type, reference_id, reason)
                     VALUES (?, ?, 'SALE', ?, 'sale', ?, ?)"
                )->execute([$warehouse, $variantId, $need['qty'], $saleId, "Pedido $number"]);
            }

            $methodId = $pdo->prepare('SELECT id FROM payment_methods WHERE code = ?');
            $methodId->execute([$method['code']]);
            $pdo->prepare(
                "INSERT INTO sale_payments (sale_id, payment_method_id, amount, installments, installment_amount, status)
                 VALUES (?, ?, ?, ?, ?, 'PENDING')"
            )->execute([$saleId, (int) $methodId->fetchColumn(), $total, $method['installments'], $installment]);

            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        return [
            'number' => $number,
            'total' => $total,
            'payment' => $payment,
            'paymentLabel' => $method['label'],
            'installments' => $method['installments'],
            'installmentAmount' => $installment,
            'points' => $customerId ? self::pointsFor($pdo, $total) : 0,
            'name' => $first,
            'email' => $email,
            'phone' => $phone,
            'address' => $address,
            'delivery' => $delivery,
            'cftea' => $payment === 'tarjeta-12' ? $financing['cftea'] : null,
        ];
    }

    public static function forUser(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare('SELECT s.id FROM sales s INNER JOIN customers c ON c.id = s.customer_id WHERE c.user_id = ? ORDER BY s.sold_at DESC, s.id DESC');
        $stmt->execute([$userId]);

        return self::load($pdo, array_map('intval', array_column($stmt->fetchAll(), 'id')));
    }

    public static function all(PDO $pdo): array
    {
        $ids = $pdo->query('SELECT id FROM sales ORDER BY sold_at DESC, id DESC LIMIT 500')->fetchAll();

        return self::load($pdo, array_map('intval', array_column($ids, 'id')));
    }

    /** @param int[] $ids */
    private static function load(PDO $pdo, array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $sales = $pdo->prepare(
            "SELECT s.id, s.sale_number, s.status, s.customer_id, s.customer_name_snapshot, s.customer_email_snapshot,
                    s.customer_phone_snapshot, s.shipping_address_snapshot, s.delivery_method, s.total, s.notes, s.sold_at,
                    s.terms_version, s.terms_accepted_at,
                    (SELECT lt.points FROM loyalty_transactions lt WHERE lt.sale_id = s.id AND lt.type = 'EARN' LIMIT 1) AS earned
             FROM sales s WHERE s.id IN ($marks) ORDER BY s.sold_at DESC, s.id DESC"
        );
        $sales->execute($ids);
        $devices = $pdo->prepare(
            "SELECT sd.sale_item_id, d.imei, w.warranty_number, w.end_date
             FROM sale_item_devices sd
             INNER JOIN sale_items si ON si.id = sd.sale_item_id AND si.sale_id IN ($marks)
             INNER JOIN imei_devices d ON d.id = sd.imei_device_id
             LEFT JOIN warranties w ON w.imei_device_id = d.id
             ORDER BY d.id"
        );
        $devices->execute($ids);
        $byItem = [];
        foreach ($devices->fetchAll() as $device) {
            $byItem[(int) $device['sale_item_id']][] = ['imei' => $device['imei'], 'warranty' => $device['warranty_number'], 'until' => $device['end_date']];
        }
        $items = $pdo->prepare(
            "SELECT si.id, si.sale_id, si.product_name_snapshot, si.quantity, si.subtotal, " . Legal::PHONE_ITEM_SQL . " AS phone
             FROM sale_items si
             INNER JOIN product_variants v ON v.id = si.variant_id
             INNER JOIN products p ON p.id = v.product_id
             INNER JOIN categories c ON c.id = p.category_id
             WHERE si.sale_id IN ($marks) ORDER BY si.id"
        );
        $items->execute($ids);
        $bySale = [];
        foreach ($items->fetchAll() as $item) {
            $bySale[(int) $item['sale_id']][] = [
                'id' => (int) $item['id'],
                'name' => $item['product_name_snapshot'],
                'qty' => (int) $item['quantity'],
                'subtotal' => (int) round((float) $item['subtotal']),
                'phone' => (bool) $item['phone'],
                'devices' => $byItem[(int) $item['id']] ?? [],
            ];
        }
        $events = $pdo->prepare("SELECT sale_id, detail, created_at FROM order_events WHERE sale_id IN ($marks) ORDER BY created_at, id");
        $events->execute($ids);
        $eventsBySale = [];
        foreach ($events->fetchAll() as $event) {
            $eventsBySale[(int) $event['sale_id']][] = ['detail' => $event['detail'], 'date' => $event['created_at']];
        }

        return array_map(static function (array $sale) use ($pdo, $bySale, $eventsBySale) {
            $total = (int) round((float) $sale['total']);
            $earned = $sale['earned'] === null ? 0 : (int) $sale['earned'];
            $pending = $sale['customer_id'] && $earned === 0 && $sale['status'] === 'PENDING' ? self::pointsFor($pdo, $total) : 0;

            return [
                'id' => (int) $sale['id'],
                'number' => $sale['sale_number'],
                'status' => $sale['status'],
                'statusLabel' => self::STATUSES[$sale['status']] ?? $sale['status'],
                'customer' => $sale['customer_name_snapshot'],
                'email' => $sale['customer_email_snapshot'],
                'phone' => $sale['customer_phone_snapshot'],
                'address' => $sale['shipping_address_snapshot'],
                'delivery' => $sale['delivery_method'],
                'termsVersion' => $sale['terms_version'],
                'termsAcceptedAt' => $sale['terms_accepted_at'],
                'events' => $eventsBySale[(int) $sale['id']] ?? [],
                'registered' => (bool) $sale['customer_id'],
                'total' => $total,
                'payment' => preg_replace('/^Pago elegido: /', '', (string) $sale['notes']),
                'date' => $sale['sold_at'],
                'items' => $bySale[(int) $sale['id']] ?? [],
                'pointsEarned' => $earned,
                'pointsPending' => $pending,
            ];
        }, $sales->fetchAll());
    }

    /** Cambia el estado. Suma puntos al pagarse y devuelve stock y puntos si se cancela. */
    public static function setStatus(PDO $pdo, int $saleId, string $status, int $userId): ?string
    {
        if (!isset(self::STATUSES[$status])) {
            return 'Ese estado no existe.';
        }

        $warehouse = Catalog::warehouse($pdo);
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT id, sale_number, status, customer_id, total FROM sales WHERE id = ? FOR UPDATE');
            $stmt->execute([$saleId]);
            $sale = $stmt->fetch();
            if (!$sale) {
                $pdo->rollBack();
                return 'No encontramos ese pedido.';
            }
            if ($sale['status'] === 'CANCELLED') {
                $pdo->rollBack();
                return 'Un pedido cancelado no se puede reabrir. Pedile al cliente que compre de nuevo.';
            }
            if ($sale['status'] === $status) {
                $pdo->rollBack();
                return null;
            }

            $account = null;
            if ($sale['customer_id']) {
                $stmt = $pdo->prepare('SELECT id, points_balance FROM loyalty_accounts WHERE customer_id = ? FOR UPDATE');
                $stmt->execute([$sale['customer_id']]);
                $account = $stmt->fetch() ?: null;
            }
            $stmt = $pdo->prepare("SELECT points FROM loyalty_transactions WHERE sale_id = ? AND type = 'EARN' LIMIT 1");
            $stmt->execute([$saleId]);
            $earned = (int) ($stmt->fetchColumn() ?: 0);

            if ($status === 'CANCELLED') {
                $parts = $pdo->prepare(
                    "SELECT COALESCE(ci.variant_id, si.variant_id) AS variant_id, si.quantity * COALESCE(ci.quantity, 1) AS qty
                     FROM sale_items si
                     INNER JOIN product_variants v ON v.id = si.variant_id
                     LEFT JOIN product_combo_items ci ON ci.combo_product_id = v.product_id
                     WHERE si.sale_id = ?"
                );
                $parts->execute([$saleId]);
                foreach ($parts->fetchAll() as $part) {
                    $pdo->prepare(
                        'INSERT INTO inventory_stock (warehouse_id, variant_id, quantity, minimum_stock) VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)'
                    )->execute([$warehouse, $part['variant_id'], $part['qty'], Catalog::LOW_STOCK]);
                    $pdo->prepare(
                        "INSERT INTO stock_movements (warehouse_id, variant_id, user_id, movement_type, quantity, reference_type, reference_id, reason)
                         VALUES (?, ?, ?, 'RETURN_IN', ?, 'sale', ?, ?)"
                    )->execute([$warehouse, $part['variant_id'], $userId, $part['qty'], $saleId, "Pedido {$sale['sale_number']} cancelado"]);
                }
                if ($account && $earned > 0) {
                    $back = min($earned, (int) $account['points_balance']);
                    $pdo->prepare('UPDATE loyalty_accounts SET points_balance = points_balance - ? WHERE id = ?')->execute([$back, $account['id']]);
                    $pdo->prepare("INSERT INTO loyalty_transactions (loyalty_account_id, sale_id, type, points, description) VALUES (?, NULL, 'ADJUSTMENT_OUT', ?, ?)")
                        ->execute([$account['id'], $back, "Pedido {$sale['sale_number']} cancelado"]);
                }
                $pdo->prepare("UPDATE sale_payments SET status = 'REFUNDED' WHERE sale_id = ? AND status = 'APPROVED'")->execute([$saleId]);
                $pdo->prepare("UPDATE sale_payments SET status = 'REJECTED' WHERE sale_id = ? AND status = 'PENDING'")->execute([$saleId]);
            }

            if (in_array($status, self::EARNING, true)) {
                if ($account && $earned === 0) {
                    $points = self::pointsFor($pdo, (int) round((float) $sale['total']));
                    if ($points > 0) {
                        $pdo->prepare('UPDATE loyalty_accounts SET points_balance = points_balance + ? WHERE id = ?')->execute([$points, $account['id']]);
                        $pdo->prepare("INSERT INTO loyalty_transactions (loyalty_account_id, sale_id, type, points, description) VALUES (?, ?, 'EARN', ?, ?)")
                            ->execute([$account['id'], $saleId, $points, "Compra {$sale['sale_number']}"]);
                    }
                }
                $pdo->prepare("UPDATE sale_payments SET status = 'APPROVED', paid_at = COALESCE(paid_at, NOW()) WHERE sale_id = ?")->execute([$saleId]);
            }

            $pdo->prepare('UPDATE sales SET status = ?, user_id = ? WHERE id = ?')->execute([$status, $userId, $saleId]);
            Legal::event($pdo, $saleId, 'STATUS_' . $status, 'Estado: ' . self::STATUSES[$status], $userId);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }

        return null;
    }

    public static function summary(PDO $pdo): array
    {
        $today = $pdo->query("SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS orders FROM sales WHERE status <> 'CANCELLED' AND DATE(sold_at) = CURDATE()")->fetch();
        $customers = (int) $pdo->query("SELECT COUNT(*) FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE r.name = 'CLIENTE' AND DATE(u.created_at) = CURDATE()")->fetchColumn();
        $pending = (int) $pdo->query("SELECT COUNT(*) FROM sales WHERE status = 'PENDING'")->fetchColumn();
        $stock = (int) $pdo->query(
            "SELECT COALESCE(SUM(i.quantity), 0) FROM inventory_stock i
             INNER JOIN product_variants v ON v.id = i.variant_id AND v.is_active = 1
             INNER JOIN products p ON p.id = v.product_id AND p.is_active = 1 AND p.product_type <> 'COMBO'"
        )->fetchColumn();

        $days = [];
        $rows = $pdo->query(
            "SELECT DATE(sold_at) AS day, SUM(total) AS total FROM sales
             WHERE status <> 'CANCELLED' AND sold_at >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE(sold_at)"
        )->fetchAll();
        $byDay = array_column($rows, 'total', 'day');
        $base = new DateTimeImmutable((string) $pdo->query('SELECT CURDATE()')->fetchColumn());
        for ($i = 6; $i >= 0; $i--) {
            $day = $base->modify("-{$i} day");
            $days[] = ['label' => $day->format('d/m'), 'total' => (int) round((float) ($byDay[$day->format('Y-m-d')] ?? 0))];
        }

        $top = $pdo->query(
            "SELECT p.name, SUM(si.quantity) AS units,
                    (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id LIMIT 1) AS image
             FROM sale_items si
             INNER JOIN sales s ON s.id = si.sale_id AND s.status <> 'CANCELLED'
             INNER JOIN product_variants v ON v.id = si.variant_id
             INNER JOIN products p ON p.id = v.product_id
             GROUP BY p.id, p.name ORDER BY units DESC LIMIT 5"
        )->fetchAll();

        $low = $pdo->prepare(
            "SELECT p.name, col.name AS color, COALESCE(i.quantity, 0) AS stock
             FROM product_variants v
             INNER JOIN products p ON p.id = v.product_id AND p.is_active = 1 AND p.product_type <> 'COMBO'
             LEFT JOIN colors col ON col.id = v.color_id
             LEFT JOIN inventory_stock i ON i.variant_id = v.id
             WHERE v.is_active = 1 AND COALESCE(i.quantity, 0) <= ?
             ORDER BY stock, p.name"
        );
        $low->execute([Catalog::LOW_STOCK]);

        return [
            'todayTotal' => (int) round((float) $today['total']),
            'todayOrders' => (int) $today['orders'],
            'newCustomers' => $customers,
            'pendingOrders' => $pending,
            'stock' => $stock,
            'days' => $days,
            'top' => array_map(static fn ($row) => ['name' => $row['name'], 'units' => (int) $row['units'], 'image' => $row['image']], $top),
            'low' => array_map(static fn ($row) => ['name' => $row['name'] . ($row['color'] ? ' · ' . $row['color'] : ''), 'stock' => (int) $row['stock']], $low->fetchAll()),
        ];
    }
}
