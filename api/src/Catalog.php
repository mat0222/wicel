<?php

declare(strict_types=1);

final class Catalog
{
    public const LOW_STOCK = 5;
    /** El usuario de la base no puede crear columnas. Esta marca en short_description indica que el precio se consulta por WhatsApp. */
    private const ASK_PRICE = 'ASK_PRICE';
    /** weight_grams no se usa para pesar: 1 significa que ese color es por encargo. */
    private const ON_ORDER = 1;
    private const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
    private const PHOTO_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    public static function warehouse(PDO $pdo): int
    {
        return (int) $pdo->query('SELECT id FROM warehouses WHERE is_active = 1 ORDER BY id LIMIT 1')->fetchColumn();
    }

    /** Productos activos con sus colores, stock y fotos. */
    public static function products(PDO $pdo): array
    {
        $rows = $pdo->query(
            'SELECT p.id, p.slug, p.name, p.description, p.short_description, p.product_type, p.is_featured, p.category_id,
                    p.created_at, b.name AS brand, c.name AS category, c.slug AS category_slug, c.phone_specs
             FROM products p
             INNER JOIN brands b ON b.id = p.brand_id
             INNER JOIN categories c ON c.id = p.category_id
             WHERE p.is_active = 1
             ORDER BY p.is_featured DESC, p.created_at DESC, p.name ASC'
        )->fetchAll();

        $variants = $pdo->prepare(
            'SELECT v.id, v.product_id, v.ram_gb, v.condition_type, v.sale_price, v.compare_at_price, v.weight_grams,
                    s.label AS storage, col.name AS color, col.hex_code AS hex,
                    COALESCE(i.quantity, 0) AS stock,
                    (SELECT pi.image_url FROM product_images pi WHERE pi.variant_id = v.id ORDER BY pi.is_primary DESC, pi.position, pi.id LIMIT 1) AS image
             FROM product_variants v
             LEFT JOIN storage_options s ON s.id = v.storage_id
             LEFT JOIN colors col ON col.id = v.color_id
             LEFT JOIN inventory_stock i ON i.variant_id = v.id AND i.warehouse_id = ?
             WHERE v.is_active = 1
             ORDER BY v.id'
        );
        $variants->execute([self::warehouse($pdo)]);
        $byProduct = [];
        $byVariant = [];
        foreach ($variants->fetchAll() as $variant) {
            $byProduct[(int) $variant['product_id']][] = $variant;
            $byVariant[(int) $variant['id']] = $variant;
        }

        $components = self::comboComponents($pdo);
        $products = [];
        foreach ($rows as $row) {
            $list = $byProduct[(int) $row['id']] ?? [];
            if ($list === [] || ($row['product_type'] === 'COMBO' && !isset($components[(int) $row['id']]))) {
                continue;
            }
            $products[] = self::shape($row, $list, $components[(int) $row['id']] ?? [], $byVariant);
        }

        return $products;
    }

    /** @return array<int, list<array{variantId: int, quantity: int}>> */
    private static function comboComponents(PDO $pdo): array
    {
        $rows = $pdo->query(
            'SELECT ci.combo_product_id, ci.variant_id, ci.quantity, (v.is_active = 1 AND p.is_active = 1) AS available
             FROM product_combo_items ci
             INNER JOIN product_variants v ON v.id = ci.variant_id
             INNER JOIN products p ON p.id = v.product_id
             ORDER BY ci.combo_product_id, ci.variant_id'
        )->fetchAll();
        $broken = [];
        foreach ($rows as $row) {
            if (!(int) $row['available']) {
                $broken[(int) $row['combo_product_id']] = true;
            }
        }
        $components = [];
        foreach ($rows as $row) {
            if (isset($broken[(int) $row['combo_product_id']])) {
                continue;
            }
            $components[(int) $row['combo_product_id']][] = [
                'variantId' => (int) $row['variant_id'],
                'quantity' => max(1, (int) $row['quantity']),
            ];
        }

        return $components;
    }

    private static function shape(array $row, array $variants, array $items, array $byVariant): array
    {
        $first = $variants[0];
        $isCombo = $row['product_type'] === 'COMBO';
        $colors = [];

        if ($isCombo) {
            $stock = $items === [] ? 0 : PHP_INT_MAX;
            $image = null;
            foreach ($items as $item) {
                $part = $byVariant[$item['variantId']] ?? null;
                $stock = min($stock, $part ? intdiv((int) $part['stock'], $item['quantity']) : 0);
                $image ??= $part['image'] ?? null;
            }
            $colors[] = ['variantId' => (int) $first['id'], 'name' => '', 'hex' => '', 'stock' => $stock, 'onOrder' => false, 'image' => $image];
        } else {
            foreach ($variants as $variant) {
                $colors[] = [
                    'variantId' => (int) $variant['id'],
                    'name' => $variant['color'] ?? 'Único',
                    'hex' => $variant['hex'] ?? '#888888',
                    'stock' => (int) $variant['stock'],
                    'onOrder' => (int) ($variant['weight_grams'] ?? 0) === self::ON_ORDER,
                    'image' => $variant['image'],
                ];
            }
        }

        $lines = array_values(array_filter(array_map('trim', explode("\n", (string) $row['description'])), 'strlen'));
        $images = array_values(array_filter(array_column($colors, 'image')));
        $phone = !$isCombo && (bool) $row['phone_specs'];

        return [
            'id' => (int) $row['id'],
            'slug' => $row['slug'],
            'name' => $row['name'],
            'brand' => $row['brand'],
            'category' => $row['category'],
            'categoryId' => (int) $row['category_id'],
            'categorySlug' => $row['category_slug'],
            'type' => $isCombo ? 'COMBO' : 'PRODUCT',
            'phone' => $phone,
            'storage' => $phone ? ($first['storage'] ?? '') : '',
            'ram' => $phone && $first['ram_gb'] ? $first['ram_gb'] . ' GB' : '',
            'condition' => $first['condition_type'] === 'NEW' ? 'Nuevos' : 'Usados',
            'price' => (int) round((float) $first['sale_price']),
            'oldPrice' => $first['compare_at_price'] === null ? null : (int) round((float) $first['compare_at_price']),
            'description' => (string) $row['description'],
            'specs' => $lines,
            'featured' => (bool) $row['is_featured'],
            'askPrice' => !$isCombo && ($row['short_description'] ?? '') === self::ASK_PRICE,
            'image' => $images[0] ?? null,
            'colors' => $colors,
            'stock' => array_sum(array_column($colors, 'stock')),
            'items' => $isCombo ? $items : [],
            'createdAt' => $row['created_at'],
        ];
    }

    public static function options(PDO $pdo): array
    {
        return [
            'categories' => self::categories($pdo),
            'brands' => self::brands($pdo),
            'colors' => $pdo->query('SELECT name, hex_code AS hex FROM colors WHERE is_active = 1 ORDER BY name')->fetchAll(),
            'storages' => array_column($pdo->query('SELECT label FROM storage_options WHERE is_active = 1 ORDER BY capacity_gb')->fetchAll(), 'label'),
        ];
    }

    public static function categories(PDO $pdo): array
    {
        $rows = $pdo->query(
            'SELECT c.id, c.name, c.slug, c.description, c.phone_specs,
                    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS products
             FROM categories c
             WHERE c.is_active = 1
             ORDER BY c.position, c.name'
        )->fetchAll();

        return array_map(static fn (array $row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'description' => (string) $row['description'],
            'phoneSpecs' => (bool) $row['phone_specs'],
            'products' => (int) $row['products'],
        ], $rows);
    }

    public static function brands(PDO $pdo): array
    {
        $rows = $pdo->query(
            'SELECT b.id, b.name,
                    (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.is_active = 1) AS products
             FROM brands b
             WHERE b.is_active = 1
             ORDER BY b.name'
        )->fetchAll();

        return array_map(static fn (array $row) => ['id' => (int) $row['id'], 'name' => $row['name'], 'products' => (int) $row['products']], $rows);
    }

    public static function saveCategory(PDO $pdo, ?int $id, string $name, string $description, bool $phoneSpecs): void
    {
        if ($id) {
            $pdo->prepare("UPDATE categories SET name = ?, description = ?, phone_specs = IF(slug = 'combos', 0, ?) WHERE id = ?")
                ->execute([$name, $description, (int) $phoneSpecs, $id]);
            $pdo->prepare("UPDATE products SET product_type = IF(?, 'PHONE', 'OTHER') WHERE category_id = ? AND product_type <> 'COMBO'")
                ->execute([(int) $phoneSpecs, $id]);
            return;
        }
        $pdo->prepare('INSERT INTO categories (name, slug, description, phone_specs, position) VALUES (?, ?, ?, ?, 99)')
            ->execute([$name, self::uniqueSlug($pdo, 'categories', $name), $description, (int) $phoneSpecs]);
    }

    /** Devuelve false si la categoría todavía tiene productos. */
    public static function deleteCategory(PDO $pdo, int $id): bool
    {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1');
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            return false;
        }
        $pdo->prepare('UPDATE categories SET is_active = 0 WHERE id = ?')->execute([$id]);

        return true;
    }

    /** Saca el producto de la tienda. Devuelve los combos que se pausaron por usarlo, o null si no existe. */
    public static function deleteProduct(PDO $pdo, int $id): ?int
    {
        $stmt = $pdo->prepare('UPDATE products SET is_active = 0 WHERE id = ? AND is_active = 1');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            return null;
        }

        return self::pauseCombosUsing($pdo, 'v.product_id = ?', [$id]);
    }

    /** Un combo no se puede vender si le falta un componente: se oculta hasta que el dueño lo arme de nuevo. */
    private static function pauseCombosUsing(PDO $pdo, string $where, array $params): int
    {
        $stmt = $pdo->prepare(
            "UPDATE products p SET p.is_active = 0
             WHERE p.product_type = 'COMBO' AND p.is_active = 1 AND p.id IN (
                 SELECT combo_product_id FROM (
                     SELECT ci.combo_product_id FROM product_combo_items ci
                     INNER JOIN product_variants v ON v.id = ci.variant_id
                     WHERE {$where}
                 ) AS used
             )"
        );
        $stmt->execute($params);

        return $stmt->rowCount();
    }

    /**
     * Crea o actualiza un producto. $data viene del formulario del panel y $files son las fotos por color.
     * Devuelve el id del producto o un texto con el problema.
     */
    public static function saveProduct(PDO $pdo, array $data, array $files, int $userId): int|string
    {
        $id = (int) ($data['id'] ?? 0);
        $name = trim((string) ($data['name'] ?? ''));
        $brand = trim((string) ($data['brand'] ?? ''));
        $categoryId = (int) ($data['categoryId'] ?? 0);
        $storage = trim((string) ($data['storage'] ?? ''));
        $ram = (int) preg_replace('/\D/', '', (string) ($data['ram'] ?? ''));
        $condition = ($data['condition'] ?? '') === 'Usados' ? 'USED' : 'NEW';
        $askPrice = !empty($data['askPrice']);
        $price = $askPrice ? 0 : (int) ($data['price'] ?? 0);
        $oldPrice = $askPrice ? 0 : (int) ($data['oldPrice'] ?? 0);
        $description = trim((string) ($data['description'] ?? ''));
        $featured = !empty($data['featured']) ? 1 : 0;
        $colors = is_array($data['colors'] ?? null) ? $data['colors'] : [];

        if ($name === '' || $brand === '') {
            return 'Escribí el nombre y la marca.';
        }
        if (!$askPrice && $price <= 0) {
            return 'Escribí el precio en pesos, sin centavos.';
        }
        if ($oldPrice !== 0 && $oldPrice <= $price) {
            return 'El precio anterior tiene que ser más alto que el precio actual, o dejalo vacío.';
        }
        if ($colors === []) {
            return 'Agregá al menos un color con su stock.';
        }
        $names = array_map(static fn ($color) => mb_strtolower(trim((string) ($color['color'] ?? ''))), $colors);
        if (in_array('', $names, true) || count(array_unique($names)) !== count($names)) {
            return 'Cada color tiene que tener nombre y no se puede repetir.';
        }
        foreach ($colors as $color) {
            if (!empty($color['onOrder'])) {
                continue;
            }
            if (!is_numeric($color['stock'] ?? null) || (int) $color['stock'] < 0) {
                return 'Escribí cuántas unidades hay de cada color. Puede ser 0.';
            }
        }

        $category = $pdo->prepare("SELECT phone_specs FROM categories WHERE id = ? AND is_active = 1 AND slug <> 'combos'");
        $category->execute([$categoryId]);
        $phone = $category->fetchColumn();
        if ($phone === false) {
            return 'Elegí una categoría.';
        }
        $phone = (bool) $phone;
        $type = $phone ? 'PHONE' : 'OTHER';
        if (!$phone) {
            $storage = '';
            $ram = 0;
        }

        $storageId = null;
        if ($storage !== '') {
            $stmt = $pdo->prepare('SELECT id FROM storage_options WHERE label = ?');
            $stmt->execute([$storage]);
            $storageId = $stmt->fetchColumn() ?: null;
        }

        $saved = [];
        foreach ($colors as $index => $color) {
            $file = $files['foto_' . $index] ?? null;
            if (is_array($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                $url = self::storePhoto($file);
                if (!str_starts_with($url, '/')) {
                    return $url;
                }
                $saved[$index] = $url;
            }
        }

        $warehouse = self::warehouse($pdo);
        $pdo->beginTransaction();
        try {
            $brandId = self::brandId($pdo, $brand);
            if ($id > 0) {
                $pdo->prepare(
                    "UPDATE products SET brand_id = ?, category_id = ?, name = ?, description = ?, short_description = ?, is_featured = ?, product_type = ?
                     WHERE id = ? AND product_type <> 'COMBO'"
                )->execute([$brandId, $categoryId, $name, $description, $askPrice ? self::ASK_PRICE : null, $featured, $type, $id]);
            } else {
                $pdo->prepare(
                    "INSERT INTO products (brand_id, category_id, name, slug, description, short_description, product_type, warranty_months, is_featured)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)"
                )->execute([$brandId, $categoryId, $name, self::uniqueSlug($pdo, 'products', $name), $description, $askPrice ? self::ASK_PRICE : null, $type, $featured]);
                $id = (int) $pdo->lastInsertId();
            }

            $existing = $pdo->prepare('SELECT id FROM product_variants WHERE product_id = ?');
            $existing->execute([$id]);
            $current = array_map('intval', array_column($existing->fetchAll(), 'id'));
            $kept = [];

            foreach ($colors as $index => $color) {
                $colorId = self::colorId($pdo, trim((string) $color['color']));
                $variantId = (int) ($color['variantId'] ?? 0);
                $onOrder = !empty($color['onOrder']);
                $fields = [$colorId, $storageId, $ram ?: null, $condition, $price, $oldPrice ?: null, $onOrder ? self::ON_ORDER : null];
                if ($variantId > 0 && in_array($variantId, $current, true)) {
                    $pdo->prepare(
                        'UPDATE product_variants SET color_id = ?, storage_id = ?, ram_gb = ?, condition_type = ?,
                                sale_price = ?, compare_at_price = ?, weight_grams = ?, is_active = 1 WHERE id = ?'
                    )->execute([...$fields, $variantId]);
                } else {
                    $pdo->prepare(
                        'INSERT INTO product_variants (color_id, storage_id, ram_gb, condition_type, sale_price, compare_at_price, weight_grams, product_id, sku)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    )->execute([...$fields, $id, 'WI-' . $id . '-' . strtoupper(bin2hex(random_bytes(4)))]);
                    $variantId = (int) $pdo->lastInsertId();
                }
                $kept[] = $variantId;

                self::setStock($pdo, $warehouse, $variantId, $onOrder ? 0 : (int) $color['stock'], $userId);

                if (isset($saved[$index])) {
                    $pdo->prepare('DELETE FROM product_images WHERE variant_id = ?')->execute([$variantId]);
                    $pdo->prepare('INSERT INTO product_images (product_id, variant_id, image_url, alt_text, is_primary) VALUES (?, ?, ?, ?, 1)')
                        ->execute([$id, $variantId, $saved[$index], limit_text($name . ' ' . trim((string) $color['color']), 255)]);
                }
            }

            foreach (array_diff($current, $kept) as $gone) {
                $pdo->prepare('UPDATE product_variants SET is_active = 0 WHERE id = ?')->execute([$gone]);
                self::pauseCombosUsing($pdo, 'v.id = ?', [$gone]);
            }

            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        return $id;
    }

    /**
     * Crea o actualiza un combo armado con productos ya cargados. El stock sale de esos productos.
     * Devuelve el id del combo o un texto con el problema.
     */
    public static function saveCombo(PDO $pdo, array $data): int|string
    {
        $id = (int) ($data['id'] ?? 0);
        $name = trim((string) ($data['name'] ?? ''));
        $price = (int) ($data['price'] ?? 0);
        $oldPrice = (int) ($data['oldPrice'] ?? 0);
        $description = trim((string) ($data['description'] ?? ''));
        $featured = !empty($data['featured']) ? 1 : 0;
        $items = [];
        foreach (is_array($data['items'] ?? null) ? $data['items'] : [] as $item) {
            $variantId = (int) ($item['variantId'] ?? 0);
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($variantId <= 0 || $quantity < 1) {
                return 'Elegí el producto, el color y la cantidad de cada fila.';
            }
            if (isset($items[$variantId])) {
                return 'Hay un producto repetido con el mismo color. Dejalo en una sola fila y subí la cantidad.';
            }
            $items[$variantId] = $quantity;
        }

        if ($name === '') {
            return 'Escribí el nombre del combo.';
        }
        if ($items === []) {
            return 'Agregá al menos un producto al combo.';
        }
        if ($price <= 0) {
            return 'Escribí el precio del combo en pesos, sin centavos.';
        }
        if ($oldPrice !== 0 && $oldPrice <= $price) {
            return 'El precio anterior tiene que ser más alto que el precio del combo, o dejalo vacío.';
        }

        $marks = implode(',', array_fill(0, count($items), '?'));
        $stmt = $pdo->prepare(
            "SELECT v.id, p.brand_id FROM product_variants v
             INNER JOIN products p ON p.id = v.product_id AND p.is_active = 1 AND p.product_type <> 'COMBO'
             WHERE v.is_active = 1 AND v.id IN ($marks)"
        );
        $stmt->execute(array_keys($items));
        $brands = array_column($stmt->fetchAll(), 'brand_id', 'id');
        if (count($brands) !== count($items)) {
            return 'Uno de los productos elegidos ya no está a la venta. Elegí otro.';
        }

        $category = (int) $pdo->query("SELECT id FROM categories WHERE slug = 'combos' LIMIT 1")->fetchColumn();
        if ($category === 0) {
            $pdo->prepare("INSERT INTO categories (name, slug, description, position) VALUES ('Combos', 'combos', 'Celular con accesorios', 2)")->execute();
            $category = (int) $pdo->lastInsertId();
        }
        $brandId = (int) $brands[array_key_first($items)];

        $pdo->beginTransaction();
        try {
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE products SET brand_id = ?, category_id = ?, name = ?, description = ?, is_featured = ?, is_active = 1 WHERE id = ? AND product_type = 'COMBO'");
                $stmt->execute([$brandId, $category, limit_text($name, 180), $description, $featured, $id]);
                $variant = $pdo->prepare('SELECT id FROM product_variants WHERE product_id = ? ORDER BY id LIMIT 1');
                $variant->execute([$id]);
                $variantId = (int) $variant->fetchColumn();
                if ($variantId === 0) {
                    $pdo->rollBack();
                    return 'No encontramos ese combo. Recargá la página.';
                }
                $pdo->prepare('UPDATE product_variants SET sale_price = ?, compare_at_price = ?, is_active = 1 WHERE id = ?')
                    ->execute([$price, $oldPrice ?: null, $variantId]);
            } else {
                $pdo->prepare(
                    "INSERT INTO products (brand_id, category_id, name, slug, description, product_type, warranty_months, is_featured)
                     VALUES (?, ?, ?, ?, ?, 'COMBO', 0, ?)"
                )->execute([$brandId, $category, limit_text($name, 180), self::uniqueSlug($pdo, 'products', 'combo ' . $name), $description, $featured]);
                $id = (int) $pdo->lastInsertId();
                $pdo->prepare('INSERT INTO product_variants (product_id, sku, sale_price, compare_at_price) VALUES (?, ?, ?, ?)')
                    ->execute([$id, 'WI-C' . $id . '-' . strtoupper(bin2hex(random_bytes(3))), $price, $oldPrice ?: null]);
            }

            $pdo->prepare('DELETE FROM product_combo_items WHERE combo_product_id = ?')->execute([$id]);
            $insert = $pdo->prepare('INSERT INTO product_combo_items (combo_product_id, variant_id, quantity) VALUES (?, ?, ?)');
            foreach ($items as $variantId => $quantity) {
                $insert->execute([$id, $variantId, $quantity]);
            }

            $pdo->commit();
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }

        return $id;
    }

    private static function setStock(PDO $pdo, int $warehouse, int $variantId, int $quantity, int $userId): void
    {
        $stmt = $pdo->prepare('SELECT quantity FROM inventory_stock WHERE warehouse_id = ? AND variant_id = ? FOR UPDATE');
        $stmt->execute([$warehouse, $variantId]);
        $before = $stmt->fetchColumn();
        $before = $before === false ? null : (int) $before;

        if ($before === null) {
            $pdo->prepare('INSERT INTO inventory_stock (warehouse_id, variant_id, quantity, minimum_stock) VALUES (?, ?, ?, ?)')
                ->execute([$warehouse, $variantId, $quantity, self::LOW_STOCK]);
        } elseif ($before !== $quantity) {
            $pdo->prepare('UPDATE inventory_stock SET quantity = ? WHERE warehouse_id = ? AND variant_id = ?')
                ->execute([$quantity, $warehouse, $variantId]);
        }

        $diff = $quantity - ($before ?? 0);
        if ($diff !== 0) {
            $pdo->prepare(
                "INSERT INTO stock_movements (warehouse_id, variant_id, user_id, movement_type, quantity, reason)
                 VALUES (?, ?, ?, ?, ?, 'Cambio desde el panel')"
            )->execute([$warehouse, $variantId, $userId ?: null, $diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', abs($diff)]);
        }
    }

    /** Devuelve la URL pública de la foto, o un mensaje de error. */
    public static function storePhoto(array $file): string
    {
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
            return 'No se pudo subir una de las fotos. Probá con otra.';
        }
        if (($file['size'] ?? 0) > self::MAX_PHOTO_BYTES) {
            return 'Cada foto puede pesar hasta 6 MB.';
        }
        $type = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
        if (!isset(self::PHOTO_TYPES[$type]) || @getimagesize($file['tmp_name']) === false) {
            return 'La foto tiene que ser JPG, PNG o WEBP.';
        }

        $dir = dirname(__DIR__) . '/uploads/productos';
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return 'No se pudo guardar la foto en el servidor.';
        }
        $name = bin2hex(random_bytes(12)) . '.' . self::PHOTO_TYPES[$type];
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
            return 'No se pudo guardar la foto en el servidor.';
        }

        return '/api/uploads/productos/' . $name;
    }

    private static function brandId(PDO $pdo, string $name): int
    {
        $stmt = $pdo->prepare('SELECT id FROM brands WHERE name = ?');
        $stmt->execute([$name]);
        $id = $stmt->fetchColumn();
        if ($id) {
            $pdo->prepare('UPDATE brands SET is_active = 1 WHERE id = ?')->execute([$id]);
            return (int) $id;
        }
        $pdo->prepare('INSERT INTO brands (name, slug) VALUES (?, ?)')->execute([limit_text($name, 100), self::uniqueSlug($pdo, 'brands', $name)]);

        return (int) $pdo->lastInsertId();
    }

    private static function colorId(PDO $pdo, string $name): int
    {
        $stmt = $pdo->prepare('SELECT id FROM colors WHERE name = ?');
        $stmt->execute([$name]);
        $id = $stmt->fetchColumn();
        if ($id) {
            return (int) $id;
        }
        $hex = [
            'naranja' => '#e8732a', 'burdeos' => '#6d1f2c', 'turquesa' => '#2bb3a8', 'crema' => '#efe6d2',
            'natural' => '#e8dcc4', 'marrón' => '#7b4a32', 'verde lima' => '#b5c934', 'verde oliva' => '#7d8b5a',
            'lima y fucsia' => '#c9e27a', 'crema con moños' => '#f3e3c4', 'crema con mapa' => '#efe8d6',
        ][mb_strtolower($name)] ?? null;
        $pdo->prepare('INSERT INTO colors (name, hex_code) VALUES (?, ?)')->execute([limit_text($name, 60), $hex]);

        return (int) $pdo->lastInsertId();
    }

    private static function uniqueSlug(PDO $pdo, string $table, string $text): string
    {
        $base = strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', iconv('UTF-8', 'ASCII//TRANSLIT', $text) ?: $text), '-')) ?: 'item';
        $base = substr($base, 0, 100);
        $slug = $base;
        $stmt = $pdo->prepare("SELECT 1 FROM {$table} WHERE slug = ?");
        for ($n = 2; ; $n++) {
            $stmt->execute([$slug]);
            if (!$stmt->fetchColumn()) {
                return $slug;
            }
            $slug = $base . '-' . $n;
        }
    }
}
