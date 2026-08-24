---
name: laravel-deploy
description: "Deployment and Dockerization for Laravel applications"
license: MIT
metadata:
  author: Junie
---

# Laravel Deployment & Dockerization

This skill describes the process of preparing a Laravel application for production, building optimized Docker images, and executing deployment steps.

## Docker Build Process

The project uses a multi-stage build to minimize image size and separate concerns.

### Stages:

1.  **composer_stage**: Installs production-only PHP dependencies.
2.  **node_stage**: Compiles frontend assets (Vite, React 19, Tailwind CSS 4).
3.  **Final Stage**: A lightweight `php:8.5-fpm-alpine` image including Nginx and Supervisord.

### Build Command:

```bash
docker build -t botsync-app .
```

## Docker Configuration Structure

- `Dockerfile`: Main build instructions.
- `.dockerignore`: Files excluded from the build context.
- `docker/nginx.conf`: Server configuration.
- `docker/php.ini`: Production PHP settings.
- `docker/supervisord.conf`: Process management (php-fpm, nginx, horizon).
- `docker/entrypoint.sh`: Initialization script.

## Production Optimization

Caching is mandatory in production to ensure maximum performance. This is automated in the `entrypoint.sh` script:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan storage:link
```

## Deployment Checklist (BotSync Standard)

1.  **Environment**: `APP_ENV=production` and `APP_DEBUG=false`.
2.  **Secrets**: Use environment variables for API keys and DB credentials. Never commit `.env`.
3.  **Permissions**: `storage` and `bootstrap/cache` must be `775` and owned by `www-data`.
4.  **Database**: Always run migrations with `--force`.
5.  **Queues**: Ensure `php artisan horizon` or `queue:work` is managed by Supervisord.
6.  **Hardening**: Return UUID `error_id` for exceptions; do not leak traces.

## Sail Commands for Maintenance

```bash
./vendor/bin/sail artisan optimize
./vendor/bin/sail artisan filament:optimize
```
