#!/bin/sh
set -eu

mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chmod -R ug+rwX storage bootstrap/cache

if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist --no-progress
elif [ ! -f bootstrap/cache/packages.php ]; then
    composer dump-autoload --optimize --no-interaction
fi

exec "$@"
