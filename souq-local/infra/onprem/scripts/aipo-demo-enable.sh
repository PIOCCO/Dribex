#!/usr/bin/env bash
# Enable temporary APIO demo at https://dribex.ma/AIPO/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.aipo-demo.yml" --env-file "$ENV_FILE")

cp "$ROOT/nginx/snippets/aipo-demo.http.conf" "$ROOT/nginx/http.d/10-aipo-demo.conf"
cp "$ROOT/nginx/snippets/aipo-demo.server.conf" "$ROOT/nginx/server.d/dribex-ma/10-aipo-demo.conf"

echo "==> Build and start aipo-web"
"${COMPOSE[@]}" build aipo-web
"${COMPOSE[@]}" up -d aipo-web nginx

echo "Demo enabled: https://dribex.ma/AIPO/"
echo "Disable with: $ROOT/scripts/aipo-demo-disable.sh"
