FROM php:8.3-cli

RUN docker-php-ext-install pdo_mysql

WORKDIR /var/www/api

EXPOSE 8080

CMD ["php", "-d", "upload_max_filesize=8M", "-d", "post_max_size=40M", "-d", "expose_php=0", "-d", "display_errors=0", "-d", "log_errors=1", "-S", "0.0.0.0:8080", "-t", ".", "router.php"]
