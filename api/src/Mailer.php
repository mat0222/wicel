<?php

declare(strict_types=1);

/**
 * Avisos por email con mail() de PHP. Necesita 'mail_from' en config.php (una casilla del dominio del sitio).
 * Si falta o el servidor no puede enviar, se registra en el log y la operación sigue: el pedido ya quedó guardado.
 */
final class Mailer
{
    public static function send(string $to, string $subject, string $body, ?string $replyTo = null): bool
    {
        $from = self::clean((string) Config::get('mail_from', ''));
        $to = self::clean($to);
        if ($from === '' || !filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $name = self::clean((string) Config::get('mail_from_name', 'wicel'));
        $headers = [
            'From' => '=?UTF-8?B?' . base64_encode($name) . "?= <{$from}>",
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding' => '8bit',
            'X-Mailer' => 'wicel',
        ];
        $replyTo = $replyTo === null ? '' : self::clean($replyTo);
        if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers['Reply-To'] = $replyTo;
        }
        try {
            $sent = @mail($to, '=?UTF-8?B?' . base64_encode(self::clean($subject)) . '?=', str_replace("\r\n", "\n", $body), $headers, '-f' . $from);
        } catch (Throwable $error) {
            $sent = false;
        }
        if (!$sent) {
            error_log("No se pudo enviar el email \"{$subject}\" a {$to}");
        }

        return $sent;
    }

    /** Casilla donde el dueño recibe los avisos: la de avisos del panel, o si no la de contacto. */
    public static function owner(PDO $pdo): string
    {
        $notify = Legal::setting($pdo, 'notify_email');

        return $notify !== '' ? $notify : Legal::setting($pdo, 'store_email');
    }

    public static function siteUrl(string $path = ''): string
    {
        $base = rtrim((string) Config::get('site_url', ''), '/');

        return $base === '' ? '' : $base . $path;
    }

    public static function money(int $value): string
    {
        return '$' . number_format($value, 0, ',', '.');
    }

    /** Saca saltos de línea para que nadie pueda agregar cabeceras desde un campo del formulario. */
    private static function clean(string $value): string
    {
        return trim((string) preg_replace('/[\r\n\t]+/', ' ', $value));
    }
}
