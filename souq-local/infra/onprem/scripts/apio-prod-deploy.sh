#!/usr/bin/env bash
# Deploy production APIO at https://dribex.ma/APIO/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APIO_ROOT="$ROOT/../../apio"
ENV_FILE="${APIO_ENV_FILE:-$ROOT/.env.apio.prod}"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"

COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.apio.prod.yml")
# shellcheck source=scripts/apio-load-env.sh
source "$ROOT/scripts/apio-load-env.sh"
# shellcheck source=/dev/null
set -a
# TAILSCALE_IP for apio-admin host bind (see docker-compose.apio-admin-tailscale.yml)
[[ -f "$DRIBEX_ENV" ]] && source "$DRIBEX_ENV"
set +a
if [[ -n "${TAILSCALE_IP:-}" ]]; then
  COMPOSE+=(-f "$ROOT/docker-compose.apio-admin-tailscale.yml")
else
  echo "WARN: TAILSCALE_IP unset — apio-admin will not publish port 7217 on the host." >&2
  echo "      Add TAILSCALE_IP=\$(tailscale ip -4) to .env.prod or export it, then redeploy." >&2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from env.apio.prod.example" >&2
  exit 1
fi

chmod +x "$ROOT/scripts/apio-verify-source.sh" 2>/dev/null || true
if ! "$ROOT/scripts/apio-verify-source.sh"; then
  echo "Run: $ROOT/scripts/apio-sync-source.sh" >&2
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

if [[ ! -f "$APIO_ROOT/admin/vite.config.ts" || ! -f "$APIO_ROOT/server/src/adminIndex.js" ]]; then
  echo "APIO source is missing the standalone admin app (admin/ + server/src/adminIndex.js)." >&2
  echo "Re-sync from Azelos branch cursor/production-audit-3967 — see souq-local/apio/README.md" >&2
  exit 1
fi

echo "==> Build APIO images"
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" build apio-server apio-web apio-admin

echo "==> Start APIO + recreate nginx (pick up /APIO routes)"
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" up -d apio-server apio-web apio-admin
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" up -d --force-recreate nginx
"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" exec nginx nginx -s reload 2>/dev/null || true

echo "APIO deployed:"
echo "  https://dribex.ma/APIO/"
echo "  https://dribex.ma/APIO/api/health"
if [[ -n "${TAILSCALE_IP:-}" ]]; then
  echo "  Super-admin UI: http://${TAILSCALE_IP}:${APIO_ADMIN_PORT:-7217}/login (Tailscale)"
fi
echo "  On-server check: curl -s http://127.0.0.1:${APIO_ADMIN_PORT:-7217}/api/health"
