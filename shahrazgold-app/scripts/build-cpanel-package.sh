#!/usr/bin/env bash

set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
frontend_root="$project_root/frontend"
frontend_output="$frontend_root/dist/client"
output_dir="$project_root/dist"
temporary_root="$(mktemp -d)"
temporary_zip="$temporary_root/shahrazgold-cpanel.zip"
app_stage="$temporary_root/shahrazgold-app"
public_stage="$temporary_root/public_html"

cleanup() {
    if [[ "$temporary_root" == /tmp/tmp.* && -d "$temporary_root" ]]; then
        rm -rf -- "$temporary_root"
    fi
}

trap cleanup EXIT

for dependency in composer php rsync zip npm; do
    if ! command -v "$dependency" >/dev/null 2>&1; then
        echo "Missing required local command: $dependency" >&2
        exit 1
    fi
done

if [[ ! -d "$frontend_root/node_modules" ]]; then
    npm --prefix "$frontend_root" ci
fi
npm --prefix "$frontend_root" run build:htdocs

if [[ ! -f "$frontend_output/index.html" ]]; then
    echo "Frontend build did not create $frontend_output/index.html" >&2
    exit 1
fi

mkdir -p "$app_stage" "$public_stage/storage" "$output_dir"

rsync -a \
    --exclude='.env' \
    --exclude='.git/' \
    --exclude='.idea/' \
    --exclude='.phpunit.result.cache' \
    --exclude='dist/' \
    --exclude='docker/' \
    --exclude='docker-compose.yml' \
    --exclude='Dockerfile' \
    --exclude='bootstrap/cache/*.php' \
    --exclude='frontend/' \
    --exclude='node_modules/' \
    --exclude='public/build/' \
    --exclude='public/assets/' \
    --exclude='public/index.html' \
    --exclude='public/storage' \
    --exclude='storage/app/private/' \
    --exclude='storage/app/public/' \
    --exclude='storage/framework/' \
    --exclude='storage/logs/' \
    --exclude='tests/' \
    --exclude='vendor/' \
    "$project_root/" "$app_stage/"

mkdir -p "$app_stage/bootstrap/cache" "$app_stage/storage/app/private" "$app_stage/storage/app/public" "$app_stage/storage/framework/cache/data" "$app_stage/storage/framework/sessions" "$app_stage/storage/framework/testing" "$app_stage/storage/framework/views" "$app_stage/storage/logs"

cp "$project_root/.env.cpanel.example" "$app_stage/.env"

app_key="$(php -r 'echo "base64:".base64_encode(random_bytes(32));')"
APP_KEY_VALUE="$app_key" perl -0pi -e 's/__APP_KEY__/$ENV{APP_KEY_VALUE}/g' "$app_stage/.env"

composer --working-dir="$app_stage" install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --classmap-authoritative

rsync -a \
    --exclude='assets/' \
    --exclude='index.html' \
    "$project_root/public/" "$public_stage/"
rsync -a --exclude='.htaccess' "$frontend_output/" "$public_stage/"
cp "$project_root/deploy/cpanel/public-index.php" "$public_stage/index.php"

printf '%s\n' \
    'Options -Indexes' \
    '<FilesMatch "\.(?:php[0-9]?|phtml|phar)$">' \
    '    Require all denied' \
    '</FilesMatch>' > "$public_stage/storage/.htaccess"

cp "$project_root/docs/CPANEL_DEPLOYMENT.fa.md" "$temporary_root/README-FIRST.fa.md"

find "$app_stage/storage" "$app_stage/bootstrap/cache" -type d -exec chmod 0755 {} +
find "$app_stage/storage" "$app_stage/bootstrap/cache" -type f -exec chmod 0644 {} +
chmod 0755 "$app_stage/artisan" "$app_stage/deploy-cpanel.php"

(
    cd "$temporary_root"
    zip -q -r "$temporary_zip" README-FIRST.fa.md shahrazgold-app public_html
)

mv -f "$temporary_zip" "$output_dir/shahrazgold-cpanel.zip"

echo "Package created: $output_dir/shahrazgold-cpanel.zip"
du -h "$output_dir/shahrazgold-cpanel.zip"
