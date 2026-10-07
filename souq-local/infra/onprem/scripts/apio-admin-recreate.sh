#!/usr/bin/env bash
# Recreate apio-admin only. Uses Dribex .env.prod for compose; APIO secrets from .env.apio.prod (env_file in YAML).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"
APIO_ENV="$ROOT/.env.apio.prod"

if [[ ! -f "$DRIBEX_ENV" ]]; then
  echo "Missing $DRIBEX_ENV (required for docker compose — MINIO_*, etc.)" >&2
  echo "Do NOT pass --env-file .env.apio.prod alone to compose." >&2
  exit 1
fi
if [[ ! -f "$APIO_ENV" ]]; then
  echo "Missing $APIO_ENV — copy from env.apio.prod.example" >&2
  exit 1
fi

cd "$ROOT"
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file "$DRIBEX_ENV" up -d --force-recreate apio-admin

echo
echo "== apio-admin env (network guard) =="
docker exec margem-prod-apio-admin-1 printenv APIO_ADMIN_PORT APIO_ADMIN_BIND APIO_ADMIN_ALLOWED_NETWORKS APIO_ADMIN_NETWORK_GUARD 2>/dev/null || true

PORT="$(docker exec margem-prod-apio-admin-1 printenv APIO_ADMIN_PORT 2>/dev/null || echo 7217)"
echo
echo "== probes =="
curl -s "http://127.0.0.1:${PORT}/api/health" 2>/dev/null && echo || echo "127.0.0.1:${PORT} failed"
TS_IP="$(tailscale ip -4 2>/dev/null || true)"
if [[ -n "$TS_IP" ]]; then
  curl -s "http://${TS_IP}:${PORT}/api/health" 2>/dev/null && echo || echo "${TS_IP}:${PORT} failed (check allowlist + docker logs for admin_network_denied)"
fi
