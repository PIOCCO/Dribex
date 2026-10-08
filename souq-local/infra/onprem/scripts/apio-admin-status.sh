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
  echo "==> Tailscale IP probe ($TS) — use APIO_ADMIN_PORT from env above"
  for p in 7217 7218; do
    line=$(curl -sI --connect-timeout 2 "http://${TS}:${p}/api/health" 2>/dev/null | head -1)
    if [[ -z "$line" ]]; then
      echo "  http://${TS}:${p} → connection refused (nothing listening)"
    elif [[ "$line" == *"404"* ]]; then
      echo "  http://${TS}:${p} → HTTP 404 (Tailscale Serve — NOT apio-admin; run: tailscale serve reset && tailscale serve --bg --http=${p} http://127.0.0.1:${p})"
    elif [[ "$line" == *"200"* ]] || [[ "$line" == *"403"* ]]; then
      echo "  http://${TS}:${p} → $line (reaching apio-admin)"
    else
      echo "  http://${TS}:${p} → $line"
    fi
  done
fi

echo
echo "Hints:"
echo "  • App listens on 127.0.0.1:\$APIO_ADMIN_PORT — browser on 100.x needs Serve OR APIO_ADMIN_BIND=$TS"
echo "  • HTTP 404 on 100.x:7217 = broken Tailscale Serve on that port (see above)"
echo "  • ERR_CONNECTION_REFUSED = wrong port (7218 vs 7217) or container down"
