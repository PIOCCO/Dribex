#!/usr/bin/env bash
# Public APIO at https://dribex.ma/APIO/ — routing, containers, health.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.apio.prod.yml")

fail=0
warn() { echo "WARN: $*" >&2; }
ok() { echo "OK: $*"; }
bad() { echo "FAIL: $*"; fail=1; }

echo "==> Nginx /APIO snippets (host mount)"
for f in "$ROOT/nginx/http.d/20-apio-prod.conf" "$ROOT/nginx/server.d/dribex-ma/20-apio-prod.conf"; do
  if [[ -f "$f" ]]; then ok "present: $f"; else bad "missing $f — run ./scripts/apio-prod-deploy.sh"; fi
done

NGINX_CID=$(docker ps -qf 'name=nginx' | head -1 || true)
if [[ -n "$NGINX_CID" ]]; then
  echo
  echo "==> nginx -t (inside container)"
  if docker exec "$NGINX_CID" nginx -t 2>&1; then ok "nginx config valid"; else bad "nginx -t failed"; fi
  echo
  echo "==> /APIO locations in running nginx"
  docker exec "$NGINX_CID" sh -c 'grep -R "location /APIO" /etc/nginx/server.d/dribex-ma/ 2>/dev/null || true'
else
  bad "nginx container not running"
fi

echo
echo "==> APIO containers"
if [[ -f "$DRIBEX_ENV" ]]; then
  "${COMPOSE[@]}" --env-file "$DRIBEX_ENV" ps apio-server apio-web 2>/dev/null || true
else
  warn "missing $DRIBEX_ENV — skip compose ps"
fi

echo
echo "==> Probes (Host: dribex.ma via local nginx)"
if [[ -n "$NGINX_CID" ]]; then
  probe() {
    local path="$1"
    local line
    line=$(curl -skI --connect-timeout 3 "https://127.0.0.1${path}" -H 'Host: dribex.ma' 2>/dev/null | head -1 || true)
    if [[ -z "$line" ]]; then
      bad "no response for $path"
      return
    fi
    echo "  $path → $line"
    if [[ "$path" == "/APIO/api/health" ]] && [[ "$line" != *"200"* && "$line" != *"204"* ]]; then
      bad "APIO API health not 200"
    fi
    if [[ "$path" == "/APIO/" ]] && [[ "$line" == *"404"* ]] && [[ "$line" == *"Next"* ]]; then
      bad "APIO SPA routed to Next.js (nginx /APIO/ missing?)"
    fi
  }
  probe "/APIO/"
  probe "/APIO/owner/login"
  probe "/APIO/api/health"
  probe "/APIO/api/auth/owner/login"
else
  warn "skip HTTPS probes (no nginx)"
fi

echo
echo "==> Public (via Cloudflare DNS, if reachable)"
for url in "https://dribex.ma/APIO/api/health" "https://dribex.ma/APIO/owner/login"; do
  body=$(curl -sS --connect-timeout 5 "$url" 2>/dev/null | head -c 200 || true)
  if [[ -z "$body" ]]; then
    warn "no response from $url"
  elif [[ "$body" == *"404: This page could not be found"* ]] || [[ "$body" == *"next-error-h1"* ]]; then
    bad "$url returns Dribex Next.js 404 — install nginx /APIO routes (apio-prod-deploy.sh) and use /APIO/owner/login not /APIO/api/auth/owner/login"
  elif [[ "$url" == *"/api/health"* ]] && [[ "$body" != *"ok"* ]] && [[ "$body" != *"healthy"* ]] && [[ "$body" != *"{"* ]]; then
    warn "$url unexpected body: ${body:0:80}..."
  else
    ok "$url reachable"
  fi
done

echo
if [[ "$fail" -ne 0 ]]; then
  echo "One or more checks failed. Fix: ./scripts/apio-prod-deploy.sh"
  exit 1
fi
echo "All checks passed."
