<?php

// Copiar como config.php y completar. config.php no se sube a git.
return [
    // Base de datos: un usuario con permisos SELECT, INSERT, UPDATE y DELETE sobre la base, nunca root.
    'host' => '127.0.0.1',
    'port' => 3306,
    'database' => 'wicel',
    'username' => 'wicel_app',
    'password' => '',

    // Emails de aviso (pedidos, contacto, postventa). Una casilla creada en el hosting con el dominio del sitio,
    // por ejemplo ventas@wicel.com.ar. Vacío: no se envían emails.
    'mail_from' => '',
    'mail_from_name' => 'wicel',

    // Dirección pública del sitio, para los links de los emails. Ejemplo: https://wicel.com.ar
    'site_url' => '',

    // Solo si el hosting pone un proxy o CDN delante (Cloudflare, balanceador): sus IPs o rangos.
    // Con la lista vacía se usa la IP de conexión, que es lo correcto sin proxy.
    // Ejemplo Cloudflare: ['173.245.48.0/20', '103.21.244.0/22', ...] (lista en https://www.cloudflare.com/ips/)
    'trusted_proxies' => [],
];
