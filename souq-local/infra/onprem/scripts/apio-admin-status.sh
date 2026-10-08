#!/usr/bin/env bash
# Why http://100.x:7217|7218 shows ERR_CONNECTION_REFUSED
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${APIO_ADMIN_PORT:-7218}"
TS="$(tailscale ip -4 2>/dev/null || echo '')"

echo "==> Container"
docker ps -a --filter name=apio-admin --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true

CID=$(docker ps -qf 'name=apio-admin' | head -1)
if [[ -z "$CID" ]]; then
  echo "FAIL: apio-admin is not running. Start with:"
  echo "  cd $ROOT && docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml --env-file .env.prod up -d apio-admin"
  exit 1
fi

echo
echo "==> Env inside container"
docker exec "$CID" printenv APIO_ADMIN_PORT APIO_ADMIN_BIND NODE_ENV 2>/dev/null || true

echo
echo "==> Recent logs"
docker logs "$CID" --tail 25 2>&1

echo
echo "==> Host listeners (7217-7219)"
ss -lntp 2>/dev/null | grep -E ':721[789]\s' || sudo ss -lntp 2>/dev/null | grep -E ':721[789]\s' || echo "(no listener on 7217-7219)"

echo
echo "==> Loopback probe"
for p in 7217 7218; do
  curl -sf --connect-timeout 2 "http://127.0.0.1:${p}/api/health" && echo " OK on 127.0.0.1:${p}" || echo " FAIL 127.0.0.1:${p}"
done

if [[ -n "$TS" ]]; then
  echo
  echo "==> Tailscale IP probe ($TS)"
  for p in 7217 7218; do
    curl -sfI --connect-timeout 2 "http://${TS}:${p}/api/health" | head -1 || echo " FAIL http://${TS}:${p}"
  done
fi

echo
echo "Hints:"
echo "  • ERR_CONNECTION_REFUSED on 100.x + APIO_ADMIN_BIND=127.0.0.1 → use tailscale serve OR set bind to $TS in .env.apio.prod"
echo "  • Wrong port in browser → check APIO_ADMIN_PORT above (use that port in URL)"
echo "  • Container Exited → read logs above; often missing APIO_ADMIN_JWT_SECRET or port in use"
