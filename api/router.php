<?php

declare(strict_types=1);

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');

if (preg_match('#^(?:/api)?/(uploads/productos/[a-f0-9]+\.(jpg|png|webp))$#', $uri, $match)) {
    $photo = __DIR__ . '/' . $match[1];
    if (!is_file($photo)) {
        http_response_code(404);
        return true;
    }
    $types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    header_remove('X-Powered-By');
    header('Content-Type: ' . $types[$match[2]]);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($photo);
    return true;
}

require __DIR__ . '/index.php';
