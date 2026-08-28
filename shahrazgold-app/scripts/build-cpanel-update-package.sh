#!/usr/bin/env bash

set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
frontend_root="$project_root/frontend"
frontend_output="$frontend_root/dist/client"
output_dir="$project_root/dist"
temporary_root="$(mktemp -d)"
temporary_zip="$temporary_root/shahrazgold-cpanel-update.zip"
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

VITE_REVERB_APP_KEY="" \
VITE_REVERB_HOST="" \
VITE_REVERB_PORT="" \
VITE_REVERB_SCHEME="" \
    npm --prefix "$frontend_root" run build:htdocs

if [[ ! -f "$frontend_output/index.html" ]]; then
    echo "Frontend build did not create $frontend_output/index.html" >&2
    exit 1
fi

mkdir -p "$app_stage" "$public_stage" "$output_dir"

# Application code is refreshed, while all host-specific and runtime files stay untouched.
rsync -a \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='.htaccess' \
    --exclude='.git/' \
    --exclude='.idea/' \
    --exclude='.phpunit.result.cache' \
    --exclude='bootstrap/cache/' \
    --exclude='dist/' \
    --exclude='docker/' \
    --exclude='docker-compose.yml' \
    --exclude='Dockerfile' \
    --exclude='database/*.sqlite*' \
    --exclude='frontend/' \
    --exclude='node_modules/' \
    --exclude='public/' \
    --exclude='storage/' \
    --exclude='tests/' \
    --exclude='vendor/' \
    "$project_root/" "$app_stage/"

composer --working-dir="$app_stage" install \
    --no-dev \
    --no-scripts \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --classmap-authoritative

# Only the newly built SPA is updated in public_html. Existing PHP, .htaccess and storage remain.
rsync -a --exclude='.htaccess' "$frontend_output/" "$public_stage/"

printf '%s\n' \
    'بسته آپدیت امن ShahrazGold' \
    '' \
    'این ZIP را در Home Directory هاست cPanel استخراج و Replace/Overwrite را تأیید کنید.' \
    'فایل‌های .env، .htaccess، public_html/index.php، storage و cache داخل بسته نیستند و دست‌نخورده می‌مانند.' \
    '' \
    'بعد از استخراج:' \
    '1) در shahrazgold-app/.env از CACHE_STORE=file، SESSION_DRIVER=file، QUEUE_CONNECTION=sync، BROADCAST_CONNECTION=log و SHAHRAZGOLD_PRESENCE_DRIVER=cache استفاده کنید.' \
    '2) در cPanel > Cron Jobs یک Cron موقت با اجرای Every Minute بسازید و CPANEL_USERNAME را عوض کنید:' \
    '   /home/CPANEL_USERNAME/shahrazgold-app/deploy-cpanel.php' \
    '3) پس از یک تا دو دقیقه، در File Manager فایل shahrazgold-app/storage/logs/cpanel-deploy.log را ببینید.' \
    '   اگر آخرین اجرا exit=0 بود، همان لحظه Cron موقت را حذف کنید.' \
    'این بسته به Redis، Reverb یا WebSocket نیاز ندارد.' \
    > "$temporary_root/README-UPDATE.fa.txt"

for protected_path in \
    "$app_stage/.env" \
    "$app_stage/.htaccess" \
    "$public_stage/.htaccess" \
    "$public_stage/index.php" \
    "$public_stage/storage"; do
    if [[ -e "$protected_path" ]]; then
        echo "Protected host file unexpectedly entered update package: $protected_path" >&2
        exit 1
    fi
done

(
    cd "$temporary_root"
    zip -q -r "$temporary_zip" README-UPDATE.fa.txt shahrazgold-app public_html
)

mv -f "$temporary_zip" "$output_dir/shahrazgold-cpanel-update.zip"

echo "Safe update package created: $output_dir/shahrazgold-cpanel-update.zip"
du -h "$output_dir/shahrazgold-cpanel-update.zip"
