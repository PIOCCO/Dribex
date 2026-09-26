#!/usr/bin/env bash
# Stop production APIO and remove /APIO nginx routes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.apio.prod.yml")

rm -f "$ROOT/nginx/http.d/20-apio-prod.conf"
rm -f "$ROOT/nginx/server.d/dribex-ma/20-apio-prod.conf"

echo "==> Stop APIO containers"
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" stop apio-web apio-server 2>/dev/null || true
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" rm -f apio-web apio-server 2>/dev/null || true

echo "==> Reload nginx without /APIO"
docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$DRIBEX_ENV" up -d nginx

echo "APIO disabled (volume apio_data kept)."
