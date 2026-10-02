<?php

declare(strict_types=1);

require __DIR__ . '/src/Database.php';
require __DIR__ . '/src/Accounts.php';
require __DIR__ . '/src/Catalog.php';
require __DIR__ . '/src/Orders.php';
require __DIR__ . '/src/Rewards.php';
require __DIR__ . '/src/Legal.php';
require __DIR__ . '/src/Security.php';

function limit_text(string $value, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }

    return substr($value, 0, $max);
}

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json(): array
{
    $payload = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($payload)) {
        respond(400, ['error' => 'Los datos no tienen un formato válido.']);
    }

    return $payload;
}

function is_https(): bool
{
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

function start_session(): void
{
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    session_name(is_https() ? '__Host-wicel_sesion' : 'wicel_sesion');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Strict',
        'secure' => is_https(),
    ]);
    session_start();

    if (!isset($_SESSION['user_id'])) {
        return;
    }
    $now = time();
    $admin = ($_SESSION['admin'] ?? false) === true;
    $expired = ($_SESSION['agent'] ?? '') !== Security::agent()
        || ($admin && $now - (int) ($_SESSION['seen_at'] ?? 0) > Security::ADMIN_IDLE)
        || ($admin && $now - (int) ($_SESSION['login_at'] ?? 0) > Security::ADMIN_MAX);
    if ($expired) {
        $_SESSION = [];
        session_regenerate_id(true);
        return;
    }
    $_SESSION['seen_at'] = $now;
}

function sign_in(PDO $pdo, int $id): ?array
{
    $account = Accounts::find($pdo, $id);
    session_regenerate_id(true);
    $_SESSION = [
        'user_id' => $id,
        'admin' => $account !== null && $account['role'] === 'administrador',
        'agent' => Security::agent(),
        'pw' => Accounts::passwordStamp($pdo, $id),
        'login_at' => time(),
        'seen_at' => time(),
    ];

    return $account;
}

function require_admin(PDO $pdo): array
{
    $id = (int) ($_SESSION['user_id'] ?? 0);
    $account = Accounts::find($pdo, $id);
    if ($account === null || $account['role'] !== 'administrador' || ($_SESSION['admin'] ?? false) !== true) {
        respond(403, ['error' => 'Solo el dueño del local puede ver esto.']);
    }
    if (!hash_equals(Accounts::passwordStamp($pdo, $id), (string) ($_SESSION['pw'] ?? ''))) {
        $_SESSION = [];
        session_regenerate_id(true);
        respond(401, ['error' => 'Tu sesión venció. Ingresá de nuevo.']);
    }

    return $account;
}

header_remove('X-Powered-By');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Cross-Origin-Resource-Policy: same-origin');
if (is_https()) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api#', '', $path) ?? '/';
$path = '/' . trim($path, '/');

if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Método no permitido.']);
}
if ($method === 'POST' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'wicel') {
    respond(403, ['error' => 'Pedido no permitido.']);
}

try {
    if ($method === 'GET' && $path === '/health') {
        Database::connect()->query('SELECT 1');
        respond(200, ['ok' => true]);
    }

    if ($method === 'GET' && $path === '/settings') {
        $pdo = Database::connect();
        $public = ['store_name', 'currency', 'bank_alias', 'bank_cbu', 'bank_holder', 'bank_name', ...array_keys(Legal::SETTINGS)];
        $stmt = $pdo->prepare('SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (' . implode(',', array_fill(0, count($public), '?')) . ')');
        $stmt->execute($public);
        $rows = $stmt->fetchAll();
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        respond(200, ['settings' => $settings]);
    }

    if ($method === 'GET' && $path === '/catalogo') {
        respond(200, ['products' => Catalog::products(Database::connect())]);
    }

    if ($method === 'POST' && $path === '/pedidos') {
        start_session();
        $payload = read_json();
        $pdo = Database::connect();
        Security::guard($pdo, 'pedido:' . Security::ip());
        Security::hit($pdo, 'pedido:' . Security::ip(), 15, 3600, 3600);
        $account = Accounts::find($pdo, (int) ($_SESSION['user_id'] ?? 0));
        $order = Orders::create($pdo, $payload, $account !== null && $account['role'] === 'cliente' ? $account : null);
        if (is_string($order)) {
            respond(422, ['error' => $order]);
        }
        respond(201, ['order' => $order]);
    }

    if ($method === 'POST' && $path === '/pedido/consulta') {
        $payload = read_json();
        $pdo = Database::connect();
        Security::guard($pdo, 'consulta:' . Security::ip());
        $order = Legal::lookup($pdo, (string) ($payload['number'] ?? ''), (string) ($payload['email'] ?? ''));
        if ($order === null) {
            Security::hit($pdo, 'consulta:' . Security::ip(), 8, 900, 900);
            respond(404, ['error' => 'No encontramos un pedido con ese número y ese email. Revisá los datos.']);
        }
        respond(200, ['order' => $order]);
    }

    if ($method === 'POST' && $path === '/postventa') {
        $pdo = Database::connect();
        Security::guard($pdo, 'postventa:' . Security::ip());
        $result = Legal::createRequest($pdo, read_json());
        if (is_string($result)) {
            Security::hit($pdo, 'postventa:' . Security::ip(), 8, 900, 900);
            respond(422, ['error' => $result]);
        }
        respond(201, ['request' => $result]);
    }

    if ($method === 'GET' && $path === '/mis-pedidos') {
        start_session();
        $id = (int) ($_SESSION['user_id'] ?? 0);
        if ($id <= 0) {
            respond(401, ['error' => 'Ingresá a tu cuenta para ver tus pedidos.']);
        }
        respond(200, ['orders' => Orders::forUser(Database::connect(), $id)]);
    }

    if ($method === 'GET' && $path === '/canjes') {
        respond(200, ['rewards' => Rewards::list(Database::connect())]);
    }

    if ($method === 'POST' && $path === '/canjes') {
        start_session();
        $id = (int) ($_SESSION['user_id'] ?? 0);
        if ($id <= 0) {
            respond(401, ['error' => 'Ingresá a tu cuenta para canjear tus puntos.']);
        }
        $payload = read_json();
        $result = Rewards::redeem(Database::connect(), $id, (int) ($payload['reward_id'] ?? 0), (string) ($payload['phone'] ?? ''));
        if (is_string($result)) {
            respond(422, ['error' => $result]);
        }
        respond(201, ['redemption' => $result]);
    }

    if ($method === 'GET' && $path === '/mis-canjes') {
        start_session();
        $id = (int) ($_SESSION['user_id'] ?? 0);
        if ($id <= 0) {
            respond(401, ['error' => 'Ingresá a tu cuenta para ver tus canjes.']);
        }
        respond(200, ['redemptions' => Rewards::forUser(Database::connect(), $id)]);
    }

    if ($method === 'POST' && $path === '/contacto') {
        $payload = read_json();
        $name = trim((string) ($payload['name'] ?? ''));
        $email = trim((string) ($payload['email'] ?? ''));
        $phone = trim((string) ($payload['phone'] ?? ''));
        $subject = trim((string) ($payload['subject'] ?? ''));
        $message = trim((string) ($payload['message'] ?? ''));

        if ($name === '' || $email === '' || $message === '') {
            respond(422, ['error' => 'Completá nombre, email y mensaje.']);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(422, ['error' => 'Revisá que el email esté completo.']);
        }

        $pdo = Database::connect();
        Security::guard($pdo, 'contacto:' . Security::ip());
        Security::hit($pdo, 'contacto:' . Security::ip(), 5, 600, 1800);
        $stmt = $pdo->prepare(
            'INSERT INTO contact_messages (name, email, phone, subject, message)
             VALUES (:name, :email, :phone, :subject, :message)'
        );
        $stmt->execute([
            'name' => limit_text($name, 150),
            'email' => limit_text($email, 150),
            'phone' => $phone === '' ? null : limit_text($phone, 30),
            'subject' => $subject === '' ? null : limit_text($subject, 180),
            'message' => limit_text($message, 5000),
        ]);

        respond(201, ['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }

    if ($method === 'POST' && $path === '/registro') {
        start_session();
        $payload = read_json();
        $name = trim((string) ($payload['name'] ?? ''));
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        if ($name === '' || $email === '' || $password === '') {
            respond(422, ['error' => 'Completá nombre, email y contraseña.']);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
            respond(422, ['error' => 'Revisá que el email esté bien escrito.']);
        }
        if (strlen($password) < 8 || strlen($password) > 200) {
            respond(422, ['error' => 'La contraseña tiene que tener al menos 8 caracteres.']);
        }

        $pdo = Database::connect();
        Security::guard($pdo, 'registro:' . Security::ip());
        Security::hit($pdo, 'registro:' . Security::ip(), 5, 3600, 3600);
        if (Accounts::emailTaken($pdo, $email)) {
            respond(409, ['error' => 'Ya hay una cuenta con ese email. Probá ingresar.']);
        }

        $id = Accounts::register($pdo, limit_text($name, 150), $email, $password);
        respond(201, ['user' => sign_in($pdo, $id)]);
    }

    if ($method === 'POST' && $path === '/login') {
        start_session();
        $payload = read_json();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '' || strlen($email) > 150 || strlen($password) > 200) {
            respond(422, ['error' => 'Escribí tu email y tu contraseña.']);
        }

        $pdo = Database::connect();
        $ip = Security::ip();
        Security::guard($pdo, 'login-ip:' . $ip);
        Security::guard($pdo, 'login-cuenta-ip:' . $email . '|' . $ip);
        Security::guard($pdo, 'login-cuenta:' . $email);

        $id = Accounts::verify($pdo, $email, $password);
        if ($id === null) {
            Security::hit($pdo, 'login-ip:' . $ip, 20, 900, 1800);
            Security::hit($pdo, 'login-cuenta-ip:' . $email . '|' . $ip, 5, 900, 900);
            Security::hit($pdo, 'login-cuenta:' . $email, 30, 3600, 3600);
            respond(401, ['error' => 'El email o la contraseña no coinciden.']);
        }

        Security::clear($pdo, 'login-cuenta-ip:' . $email . '|' . $ip);
        $account = sign_in($pdo, $id);
        if ($account !== null && $account['role'] === 'administrador') {
            Legal::audit($pdo, $id, 'Ingresó al panel', 'sesion', $id);
        }
        respond(200, ['user' => $account]);
    }

    if ($method === 'GET' && $path === '/sesion') {
        start_session();
        $id = (int) ($_SESSION['user_id'] ?? 0);
        $account = $id > 0 ? Accounts::find(Database::connect(), $id) : null;
        respond(200, ['user' => $account]);
    }

    if ($method === 'POST' && $path === '/logout') {
        start_session();
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict', 'secure' => is_https()]);
        respond(200, ['ok' => true]);
    }

    if ($method === 'GET' && $path === '/admin/cuentas') {
        start_session();
        $pdo = Database::connect();
        require_admin($pdo);
        respond(200, ['accounts' => Accounts::all($pdo)]);
    }

    if ($method === 'POST' && $path === '/admin/puntos') {
        start_session();
        $pdo = Database::connect();
        $admin = require_admin($pdo);
        $payload = read_json();
        $userId = (int) ($payload['user_id'] ?? 0);
        $points = (int) ($payload['points'] ?? 0);
        $reason = trim((string) ($payload['reason'] ?? ''));

        if ($userId <= 0 || $points === 0) {
            respond(422, ['error' => 'Escribí cuántos puntos sumar o restar.']);
        }
        if ($reason === '') {
            respond(422, ['error' => 'Contá el motivo, por ejemplo: compra en el local.']);
        }

        $balance = Accounts::adjustPoints($pdo, $userId, $points, limit_text($reason, 255));
        if ($balance === null) {
            respond(422, ['error' => 'No se puede: el cliente no tiene tantos puntos, o no es un cliente.']);
        }
        Legal::audit($pdo, (int) $admin['id'], 'Ajustó puntos', 'cuenta', $userId, ['puntos' => $points, 'motivo' => $reason]);
        respond(200, ['points' => $balance]);
    }

    if (str_starts_with($path, '/admin/')) {
        start_session();
        $pdo = Database::connect();
        $admin = require_admin($pdo);

        if ($method === 'GET' && $path === '/admin/opciones') {
            respond(200, Catalog::options($pdo));
        }

        if ($method === 'POST' && $path === '/admin/productos') {
            $data = json_decode((string) ($_POST['data'] ?? ''), true);
            if (!is_array($data)) {
                respond(400, ['error' => 'Los datos no tienen un formato válido.']);
            }
            $saved = Catalog::saveProduct($pdo, $data, $_FILES, (int) $admin['id']);
            if (is_string($saved)) {
                respond(422, ['error' => $saved]);
            }
            Legal::audit($pdo, (int) $admin['id'], empty($data['id']) ? 'Creó producto' : 'Editó producto', 'producto', $saved, ['nombre' => $data['name'] ?? '']);
            respond(200, ['id' => $saved]);
        }

        if ($method === 'POST' && $path === '/admin/combos') {
            $payload = read_json();
            $saved = Catalog::saveCombo($pdo, $payload);
            if (is_string($saved)) {
                respond(422, ['error' => $saved]);
            }
            Legal::audit($pdo, (int) $admin['id'], empty($payload['id']) ? 'Creó combo' : 'Editó combo', 'producto', $saved, ['nombre' => $payload['name'] ?? '', 'precio' => $payload['price'] ?? null]);
            respond(200, ['id' => $saved]);
        }

        if ($method === 'POST' && $path === '/admin/productos/eliminar') {
            $id = (int) (read_json()['id'] ?? 0);
            Catalog::deleteProduct($pdo, $id);
            Legal::audit($pdo, (int) $admin['id'], 'Eliminó producto', 'producto', $id);
            respond(200, ['ok' => true]);
        }

        if ($method === 'POST' && $path === '/admin/categorias') {
            $payload = read_json();
            $name = trim((string) ($payload['name'] ?? ''));
            if ($name === '') {
                respond(422, ['error' => 'Escribí el nombre de la categoría.']);
            }
            $phoneSpecs = ($payload['phoneSpecs'] ?? false) === true;
            Catalog::saveCategory($pdo, (int) ($payload['id'] ?? 0) ?: null, limit_text($name, 120), trim((string) ($payload['description'] ?? '')), $phoneSpecs);
            Legal::audit($pdo, (int) $admin['id'], empty($payload['id']) ? 'Creó categoría' : 'Editó categoría', 'categoria', (int) ($payload['id'] ?? 0), ['nombre' => $name, 'fichaCelular' => $phoneSpecs]);
            respond(200, ['categories' => Catalog::categories($pdo)]);
        }

        if ($method === 'POST' && $path === '/admin/categorias/eliminar') {
            $id = (int) (read_json()['id'] ?? 0);
            if (!Catalog::deleteCategory($pdo, $id)) {
                respond(422, ['error' => 'Esa categoría todavía tiene productos. Pasalos a otra categoría antes de borrarla.']);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Eliminó categoría', 'categoria', $id);
            respond(200, ['categories' => Catalog::categories($pdo)]);
        }

        if ($method === 'GET' && $path === '/admin/ventas') {
            respond(200, ['orders' => Orders::all($pdo), 'statuses' => Orders::STATUSES]);
        }

        if ($method === 'POST' && $path === '/admin/ventas/estado') {
            $payload = read_json();
            $problem = Orders::setStatus($pdo, (int) ($payload['id'] ?? 0), (string) ($payload['status'] ?? ''), (int) $admin['id']);
            if ($problem !== null) {
                respond(422, ['error' => $problem]);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Cambió estado de pedido', 'venta', (int) ($payload['id'] ?? 0), ['estado' => $payload['status'] ?? '']);
            respond(200, ['orders' => Orders::all($pdo)]);
        }

        if ($method === 'POST' && $path === '/admin/ventas/imei') {
            $payload = read_json();
            $problem = Legal::registerDevice($pdo, (int) ($payload['saleItemId'] ?? 0), (string) ($payload['imei'] ?? ''), (string) ($payload['serial'] ?? ''));
            if ($problem !== null) {
                respond(422, ['error' => $problem]);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Cargó IMEI y abrió garantía', 'venta', (int) ($payload['saleItemId'] ?? 0), ['imei' => preg_replace('/\D/', '', (string) ($payload['imei'] ?? ''))]);
            respond(200, ['orders' => Orders::all($pdo)]);
        }

        if ($method === 'GET' && $path === '/admin/postventa') {
            respond(200, [
                'requests' => Legal::requests($pdo),
                'requestStatuses' => Legal::REQUEST_STATUSES,
                'warranties' => Legal::warranties($pdo),
                'claimStatuses' => Legal::CLAIM_STATUSES,
            ]);
        }

        if ($method === 'POST' && $path === '/admin/postventa/estado') {
            $payload = read_json();
            $problem = Legal::setRequestStatus($pdo, (int) ($payload['id'] ?? 0), (string) ($payload['status'] ?? ''), trim((string) ($payload['note'] ?? '')), (int) $admin['id']);
            if ($problem !== null) {
                respond(422, ['error' => $problem]);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Cambió estado de solicitud', 'postventa', (int) ($payload['id'] ?? 0), ['estado' => $payload['status'] ?? '', 'nota' => $payload['note'] ?? '']);
            respond(200, ['requests' => Legal::requests($pdo)]);
        }

        if ($method === 'POST' && $path === '/admin/garantias/reclamo') {
            $payload = read_json();
            $problem = Legal::openClaim($pdo, (int) ($payload['warrantyId'] ?? 0), (string) ($payload['issue'] ?? ''), (int) $admin['id']);
            if ($problem !== null) {
                respond(422, ['error' => $problem]);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Abrió reclamo de garantía', 'garantia', (int) ($payload['warrantyId'] ?? 0));
            respond(200, ['warranties' => Legal::warranties($pdo)]);
        }

        if ($method === 'POST' && $path === '/admin/garantias/reclamo/estado') {
            $payload = read_json();
            $problem = Legal::setClaim($pdo, (int) ($payload['id'] ?? 0), (string) ($payload['status'] ?? ''), (string) ($payload['diagnosis'] ?? ''), (string) ($payload['resolution'] ?? ''), (int) $admin['id']);
            if ($problem !== null) {
                respond(422, ['error' => $problem]);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Actualizó reclamo de garantía', 'reclamo', (int) ($payload['id'] ?? 0), ['estado' => $payload['status'] ?? '']);
            respond(200, ['warranties' => Legal::warranties($pdo)]);
        }

        if ($method === 'GET' && $path === '/admin/auditoria') {
            respond(200, ['entries' => Legal::auditLog($pdo)]);
        }

        if ($method === 'GET' && $path === '/admin/canjes') {
            respond(200, ['rewards' => Rewards::list($pdo, true), 'redemptions' => Rewards::redemptions($pdo), 'statuses' => Rewards::STATUSES]);
        }

        if ($method === 'POST' && $path === '/admin/canjes/premio') {
            $data = json_decode((string) ($_POST['data'] ?? ''), true);
            if (!is_array($data)) {
                respond(400, ['error' => 'Los datos no tienen un formato válido.']);
            }
            $saved = Rewards::save($pdo, $data, $_FILES['foto'] ?? null);
            if (is_string($saved)) {
                respond(422, ['error' => $saved]);
            }
            Legal::audit($pdo, (int) $admin['id'], empty($data['id']) ? 'Creó premio' : 'Editó premio', 'premio', (int) ($data['id'] ?? 0), ['nombre' => $data['name'] ?? '']);
            respond(200, ['rewards' => Rewards::list($pdo, true)]);
        }

        if ($method === 'POST' && $path === '/admin/canjes/visible') {
            $payload = read_json();
            Rewards::setActive($pdo, (int) ($payload['id'] ?? 0), (bool) ($payload['active'] ?? false));
            Legal::audit($pdo, (int) $admin['id'], ($payload['active'] ?? false) ? 'Mostró premio' : 'Ocultó premio', 'premio', (int) ($payload['id'] ?? 0));
            respond(200, ['rewards' => Rewards::list($pdo, true)]);
        }

        if ($method === 'POST' && $path === '/admin/canjes/estado') {
            $payload = read_json();
            $problem = Rewards::setStatus($pdo, (int) ($payload['id'] ?? 0), (string) ($payload['status'] ?? ''));
            if ($problem !== null) {
                respond(422, ['error' => $problem]);
            }
            Legal::audit($pdo, (int) $admin['id'], 'Cambió estado de canje', 'canje', (int) ($payload['id'] ?? 0), ['estado' => $payload['status'] ?? '']);
            respond(200, ['redemptions' => Rewards::redemptions($pdo), 'rewards' => Rewards::list($pdo, true)]);
        }

        if ($method === 'GET' && $path === '/admin/resumen') {
            respond(200, Orders::summary($pdo));
        }

        if ($method === 'POST' && $path === '/admin/ajustes') {
            $payload = read_json();
            $stmt = $pdo->prepare(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
            );
            $limits = ['bank_alias' => 120, 'bank_cbu' => 120, 'bank_holder' => 120, 'bank_name' => 120] + Legal::SETTINGS;
            foreach (['vat_rate', 'installments_rate', 'installments_cftea'] as $key) {
                $value = str_replace(',', '.', trim((string) ($payload[$key] ?? '')));
                if ($value !== '' && (!is_numeric($value) || (float) $value < 0 || (float) $value > 999)) {
                    respond(422, ['error' => 'Los porcentajes van solo con números, por ejemplo 18 o 95,4.']);
                }
            }
            $changed = [];
            foreach ($limits as $key => $max) {
                if (array_key_exists($key, $payload)) {
                    $stmt->execute([$key, limit_text(trim((string) $payload[$key]), $max)]);
                    $changed[] = $key;
                }
            }
            Legal::audit($pdo, (int) $admin['id'], 'Cambió la configuración', 'ajustes', null, ['campos' => $changed]);
            respond(200, ['ok' => true]);
        }
    }

    respond(404, ['error' => 'No encontrado']);
} catch (PDOException $error) {
    error_log((string) $error);
    respond(500, ['error' => 'No se pudo conectar con la base de datos.']);
} catch (Throwable $error) {
    error_log((string) $error);
    respond(500, ['error' => 'Algo falló en el servidor. Probá de nuevo.']);
}
