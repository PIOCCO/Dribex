#!/usr/bin/env bash
# Why http://100.x:7217 returns Go 404 while 127.0.0.1 works.
set -euo pipefail

PORT="${APIO_ADMIN_PORT:-7217}"
TS_IP="$(tailscale ip -4 2>/dev/null || true)"

echo "== apio-admin container =="
docker ps --filter name=apio-admin --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null || true
docker logs margem-prod-apio-admin-1 --tail 5 2>/dev/null || true

echo
echo "== Tailscale Serve (if 7217 listed here, it causes Go 404 until reset or fixed) =="
tailscale serve status 2>/dev/null || echo "(tailscale serve status unavailable)"

echo
echo "== Listeners on ${PORT} =="
ss -lntp 2>/dev/null | grep ":${PORT}" || sudo ss -lntp 2>/dev/null | grep ":${PORT}" || echo "nothing listening on ${PORT}?"

echo
echo "== HTTP probes =="
curl -sI "http://127.0.0.1:${PORT}/login" 2>/dev/null | head -3 || echo "127.0.0.1:${PORT} failed"
if [[ -n "$TS_IP" ]]; then
  curl -sI "http://${TS_IP}:${PORT}/login" 2>/dev/null | head -3 || echo "${TS_IP}:${PORT} failed"
fi

echo
echo "Fix (pick one):"
echo "  A) tailscale serve reset && tailscale serve --bg --http=${PORT} http://127.0.0.1:${PORT}   # APIO_ADMIN_BIND=127.0.0.1"
echo "  B) tailscale serve reset && set APIO_ADMIN_BIND=${TS_IP:-100.x} in .env.apio.prod && recreate apio-admin"
