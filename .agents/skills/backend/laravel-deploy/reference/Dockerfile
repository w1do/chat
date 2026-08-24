# Stage 1: PHP Dependencies
FROM php:8.5-fpm-alpine AS composer_stage

WORKDIR /var/www/html

# Install dependencies for composer
RUN apk add --no-cache git unzip libzip-dev libpng-dev libpq-dev

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy composer files
COPY composer.json composer.lock ./

# Install production dependencies
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs

# Stage 2: Frontend Assets
FROM node:22-alpine AS node_stage

WORKDIR /var/www/html

# Copy node files
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci

# Copy application files (including vendor for Ziggy in SSR)
COPY . .
# Copy vendor from composer_stage to ensure Ziggy is available for SSR build
COPY --from=composer_stage /var/www/html/vendor ./vendor

RUN npm run build

# Stage 3: Final Production Image
FROM php:8.5-fpm-alpine

LABEL maintainer="Junie"
LABEL description="Minimal production image for Laravel 13 RAG System"

WORKDIR /var/www/html

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    libzip \
    libpng \
    libpq \
    icu-libs \
    freetype \
    libjpeg-turbo \
    git \
    unzip

# Install PHP extensions
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    libzip-dev \
    libpng-dev \
    postgresql-dev \
    icu-dev \
    zlib-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
    bcmath \
    gd \
    intl \
    pdo_pgsql \
    zip \
    pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Copy Composer binary from stage 1
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy configuration files
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/php.ini $PHP_INI_DIR/conf.d/99-overrides.ini
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint

# Copy vendor from composer_stage
COPY --from=composer_stage /var/www/html/vendor ./vendor

# Copy build assets from node_stage
COPY --from=node_stage /var/www/html/public/build ./public/build

# Copy application files
COPY . .

# Final optimization and permissions
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p /var/log/supervisor \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

# Remove unnecessary files to further reduce size
RUN rm -rf docker tests node_modules

EXPOSE 80

ENTRYPOINT ["entrypoint"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
