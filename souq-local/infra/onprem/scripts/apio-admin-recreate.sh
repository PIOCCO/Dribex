#!/usr/bin/env bash
# Recreate apio-admin with host ports (127.0.0.1 + optional Tailscale IP).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"

COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.apio.prod.yml")

if [[ -f "$DRIBEX_ENV" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "$DRIBEX_ENV"
  set +a
fi

if [[ -z "${TAILSCALE_IP:-}" ]] && command -v tailscale >/dev/null; then
  TAILSCALE_IP="$(tailscale ip -4 2>/dev/null || true)"
  export TAILSCALE_IP
fi

if [[ -n "${TAILSCALE_IP:-}" ]]; then
  COMPOSE+=(-f "$ROOT/docker-compose.apio-admin-tailscale.yml")
  echo "Using TAILSCALE_IP=$TAILSCALE_IP for apio-admin publish"
else
  echo "TAILSCALE_IP unset — only 127.0.0.1:7217 will be published (see docker-compose.apio.prod.yml)" >&2
fi

"${COMPOSE[@]}" --env-file "$DRIBEX_ENV" up -d --force-recreate apio-admin

echo "Port bindings:"
docker port margem-prod-apio-admin-1 7217 2>/dev/null || docker port "$(docker ps -qf name=apio-admin)" 7217 || true
echo "Health:"
curl -sf "http://127.0.0.1:${APIO_ADMIN_PORT:-7217}/api/health" && echo || echo "curl failed — check: docker logs margem-prod-apio-admin-1 --tail 30"
