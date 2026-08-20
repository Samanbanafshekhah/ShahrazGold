#!/usr/bin/env bash

set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
frontend_root="$project_root/frontend"
frontend_output="$frontend_root/dist/client"
public_root="$project_root/public"

if [[ ! -d "$frontend_root/node_modules" ]]; then
    npm --prefix "$frontend_root" ci
fi

npm --prefix "$frontend_root" run build:htdocs

if [[ ! -f "$frontend_output/index.html" ]]; then
    echo "Frontend build did not create $frontend_output/index.html" >&2
    exit 1
fi

mkdir -p "$public_root"
rsync -a --exclude='.htaccess' "$frontend_output/" "$public_root/"

echo "Frontend copied to Laravel public directory."
