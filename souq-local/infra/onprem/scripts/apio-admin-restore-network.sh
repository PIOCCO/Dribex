#!/usr/bin/env bash
# Restore Tailscale admin access after git pull / UI rebuild reset bind to 127.0.0.1:7217.
# Keeps new UI image; fixes networking the way you had it (direct on 100.x, usually port 7218).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${APIO_ENV_FILE:-$ROOT/.env.apio.prod}"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"
TS_IP="$(tailscale ip -4 2>/dev/null || true)"
PORT="${APIO_ADMIN_PORT:-7218}"

if [[ -z "$TS_IP" ]]; then
  echo "Could not get tailscale ip -4" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

echo "==> Tailscale Serve must not own port $PORT when using direct bind"
tailscale serve reset 2>/dev/null || true

echo "==> Ensure $ENV_FILE has (edit manually if values differ):"
cat <<EOF

APIO_ADMIN_PORT=$PORT
APIO_ADMIN_BIND=$TS_IP
APIO_ADMIN_ALLOWED_NETWORKS=100.64.0.0/10,127.0.0.0/8
APIO_ADMIN_ALLOW_HTTP=true
ADMIN_COOKIE_SECURE=false
ADMIN_COOKIE_SAME_SITE=lax

EOF

set_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_kv APIO_ADMIN_PORT "$PORT"
set_kv APIO_ADMIN_BIND "$TS_IP"
set_kv APIO_ADMIN_ALLOWED_NETWORKS "100.64.0.0/10,127.0.0.0/8"
set_kv APIO_ADMIN_ALLOW_HTTP "true"
set_kv ADMIN_COOKIE_SECURE "false"
set_kv ADMIN_COOKIE_SAME_SITE "lax"

echo "==> Recreate apio-admin (no rebuild unless you changed APIO source)"
cd "$ROOT"
# shellcheck source=scripts/apio-load-env.sh
source "$ROOT/scripts/apio-load-env.sh"
echo "Compose will use APIO_ADMIN_BIND=${APIO_ADMIN_BIND:-?} APIO_ADMIN_PORT=${APIO_ADMIN_PORT:-?}"
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file "$DRIBEX_ENV" up -d --force-recreate apio-admin

sleep 2
docker logs margem-prod-apio-admin-1 --tail 5

echo
echo "==> Probes"
curl -sf "http://127.0.0.1:${PORT}/api/health" && echo " (127.0.0.1:${PORT} — may fail if bind is TS IP only)" || true
curl -sf "http://${TS_IP}:${PORT}/api/health" && echo " (TS IP OK)" || echo "FAIL http://${TS_IP}:${PORT}/api/health"

csp=$(curl -sI --connect-timeout 2 "http://${TS_IP}:${PORT}/login" 2>/dev/null | tr -d '\r' | awk -F': ' 'tolower($1)=="content-security-policy"{print $2; exit}')
if [[ "$csp" == *"upgrade-insecure-requests"* ]]; then
  echo
  echo "WARN: CSP still has upgrade-insecure-requests → white screen on http://"
  echo "  Run: ./scripts/apio-admin-rebuild.sh  (sync must keep server/src/security.js from Dribex)"
fi

echo
echo "Open: http://${TS_IP}:${PORT}/login"
echo "If UI is old, run ./scripts/apio-admin-rebuild.sh after git pull on cursor/apio-admin-i18n-8c79"
