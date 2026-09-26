#!/usr/bin/env bash
# Deploy production APIO at https://dribex.ma/APIO/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="$ROOT/../../apio"
ENV_FILE="${APIO_ENV_FILE:-$ROOT/.env.apio.prod}"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"

COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.apio.prod.yml")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from env.apio.prod.example" >&2
  exit 1
fi

if [[ ! -f "$APIO_ROOT/server/package.json" || ! -f "$APIO_ROOT/package.json" ]]; then
  echo "Missing APIO source at $APIO_ROOT" >&2
  echo "Sync maisonmaroc from Azelos — see souq-local/apio/README.md" >&2
  exit 1
fi

if [[ ! -f "$DRIBEX_ENV" ]]; then
  echo "Missing Dribex $DRIBEX_ENV (required for nginx stack)" >&2
  exit 1
fi

echo "==> Install nginx routes for /APIO"
chmod +x "$ROOT/scripts/apio-write-admin-allowlist.sh"
"$ROOT/scripts/apio-write-admin-allowlist.sh" "$ENV_FILE"
cp "$ROOT/nginx/snippets/apio-prod.http.conf" "$ROOT/nginx/http.d/20-apio-prod.conf"
cp "$ROOT/nginx/snippets/apio-prod.server.conf" "$ROOT/nginx/server.d/dribex-ma/20-apio-prod.conf"

echo "==> Build APIO images"
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" build apio-server apio-web

echo "==> Start APIO + reload nginx"
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" up -d apio-server apio-web nginx

echo "APIO deployed:"
echo "  https://dribex.ma/APIO/"
echo "  https://dribex.ma/APIO/api/health"
