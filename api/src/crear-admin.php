<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/Database.php';
require __DIR__ . '/Accounts.php';

[$script, $email, $password, $name] = array_pad($argv, 4, '');
$email = strtolower(trim($email));

$weak = strlen($password) < 12
    || !preg_match('/[a-zA-Z]/', $password)
    || !preg_match('/\d/', $password)
    || stripos($password, explode('@', $email)[0]) !== false
    || preg_match('/^(.)\1+$/', $password);

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $weak) {
    fwrite(STDERR, "Uso: php src/crear-admin.php email contraseña \"Nombre\"\nLa contraseña necesita al menos 12 caracteres, con letras y números, y no puede contener el email.\n");
    exit(1);
}

Accounts::saveAdmin(Database::connect(), $name !== '' ? $name : 'Dueño del local', $email, $password);
echo "Listo: {$email} puede entrar al panel como administrador.\n";
