#!/usr/bin/env bash
# Emergency: restore dribex.ma / api.dribex.ma when Cloudflare shows 522.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$ENV_FILE")

echo "==> Tailscale vs 443"
if sudo ss -lntp 2>/dev/null | grep -q ':443.*tailscale'; then
  echo "Port 443 held by tailscale — resetting serve/funnel"
  sudo tailscale serve reset 2>/dev/null || true
  sudo tailscale funnel reset 2>/dev/null || true
fi

echo "==> Optional: strip /APIO nginx routes (APIO containers may stay up)"
if [[ -f "$ROOT/nginx/http.d/20-apio-prod.conf" ]]; then
  rm -f "$ROOT/nginx/http.d/20-apio-prod.conf"
  rm -f "$ROOT/nginx/server.d/dribex-ma/20-apio-prod.conf"
  echo "Removed 20-apio-prod.conf snippets"
fi

echo "==> Start core stack (postgres → api/web → nginx)"
"${COMPOSE[@]}" up -d postgres redis minio
"${COMPOSE[@]}" up -d api web
"${COMPOSE[@]}" up -d --force-recreate nginx

echo "==> Local checks"
curl -sf --max-time 10 http://127.0.0.1/health && echo " /health OK" || echo " /health FAILED"
code="$(curl -sk --max-time 10 -o /dev/null -w '%{http_code}' -H 'Host: dribex.ma' https://127.0.0.1/ || echo 000)"
echo "https://127.0.0.1/ (Host: dribex.ma) → HTTP $code"

echo ""
echo "If HTTP 200/301 here but Cloudflare still 522, check CF origin IP and ufw allow 443."
echo "See docs/CLOUDFLARE-522-RECOVERY.md"
