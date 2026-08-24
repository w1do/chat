# Production-образ API: Laravel Octane на FrankenPHP (ADR-009).
# Контекст сборки — корень монорепозитория:
#   docker build -f infra/docker/api/Dockerfile -t vendor/chat-api:<version> .

# --- Stage 1: composer dependencies -----------------------------------------
FROM composer:2.8 AS composer-deps

WORKDIR /build

# path repositories: пакеты должны лежать рядом с приложением
COPY packages/backend/ packages/backend/
COPY apps/chat-api/composer.json apps/chat-api/composer.lock apps/chat-api/
RUN cd apps/chat-api \
    && composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# --- Stage 2: runtime -------------------------------------------------------
FROM dunglas/frankenphp:1.9-php8.4 AS runtime

RUN install-php-extensions pcntl pdo_pgsql redis opcache intl zip \
    && useradd --create-home --uid 10001 app

COPY infra/docker/api/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY infra/docker/api/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY infra/docker/api/healthcheck.sh /usr/local/bin/healthcheck.sh
COPY infra/docker/api/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/healthcheck.sh /usr/local/bin/entrypoint.sh

WORKDIR /app
COPY --chown=app:app apps/chat-api/ /app/
COPY --chown=app:app packages/backend/ /packages/backend/
COPY --from=composer-deps --chown=app:app /build/apps/chat-api/vendor/ /app/vendor/
RUN sed -i 's#"url": "../../packages/backend/#"url": "/packages/backend/#g' composer.json \
    && composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi \
    && chown -R app:app /app/storage /app/bootstrap/cache

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD ["/usr/local/bin/healthcheck.sh"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8000"]
