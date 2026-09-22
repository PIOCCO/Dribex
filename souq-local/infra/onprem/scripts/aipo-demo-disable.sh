#!/usr/bin/env bash
# Remove temporary APIO demo (/AIPO) and stop aipo-web.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$ENV_FILE")

rm -f "$ROOT/nginx/http.d/10-aipo-demo.conf"
rm -f "$ROOT/nginx/server.d/dribex-ma/10-aipo-demo.conf"

echo "==> Stop aipo-web (if running)"
docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.aipo-demo.yml" --env-file "$ENV_FILE" stop aipo-web 2>/dev/null || true
docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.aipo-demo.yml" --env-file "$ENV_FILE" rm -f aipo-web 2>/dev/null || true

echo "==> Reload nginx without /AIPO routes"
"${COMPOSE[@]}" up -d nginx

echo "AIPO demo disabled. Placeholder configs restored in http.d / server.d."
