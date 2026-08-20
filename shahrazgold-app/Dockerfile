# syntax=docker/dockerfile:1.7
FROM composer:2.10.2 AS composer

FROM node:22-alpine AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build:htdocs \
    && rm -f dist/client/.htaccess

FROM php:8.4.23-fpm-bookworm

ARG APP_UID=1000
ARG APP_GID=1000

ENV APP_ENV=local \
    COMPOSER_HOME=/home/app/.composer \
    HOME=/home/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_pgsql \
        pgsql \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/php/entrypoint.sh /usr/local/bin/app-entrypoint

RUN groupadd --gid "${APP_GID}" app \
    && useradd --uid "${APP_UID}" --gid app --create-home --shell /bin/sh app \
    && mkdir -p /var/www/html /home/app/.composer \
    && chown -R app:app /var/www/html /home/app \
    && chmod +x /usr/local/bin/app-entrypoint

WORKDIR /var/www/html

COPY --chown=app:app composer.json composer.lock ./

USER app

RUN composer install \
    --no-interaction \
    --prefer-dist \
    --no-progress \
    --no-scripts

COPY --chown=app:app . .
COPY --from=frontend --chown=app:app /frontend/dist/client/ ./public/

RUN composer dump-autoload --optimize --no-interaction

RUN mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 9000

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm", "-F"]
