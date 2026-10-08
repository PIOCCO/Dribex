#!/usr/bin/env bash
# Postgres data volume keeps the password from first init; changing POSTGRES_PASSWORD in
# .env.prod alone causes: "password authentication failed for user margem" in api logs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
PG_CONTAINER="${PG_CONTAINER:-margem-prod-postgres-1}"
PG_USER="${POSTGRES_USER:-margem}"
PG_DB="${POSTGRES_DB:-margem}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

matches=$(grep -cE '^POSTGRES_PASSWORD=' "$ENV_FILE" 2>/dev/null || echo 0)
if [[ "$matches" -ne 1 ]]; then
  echo "FAIL: $ENV_FILE must contain exactly one POSTGRES_PASSWORD= line (found $matches)" >&2
  grep -n '^POSTGRES_PASSWORD=' "$ENV_FILE" >&2 || true
  exit 1
fi

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "POSTGRES_PASSWORD is empty in $ENV_FILE" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  echo "$PG_CONTAINER is not running — start postgres first." >&2
  exit 1
fi

echo "==> Set role '$PG_USER' password to match POSTGRES_PASSWORD in $ENV_FILE"
if [[ "$POSTGRES_PASSWORD" == *"'"* ]]; then
  echo "POSTGRES_PASSWORD contains a single quote — set password manually via psql." >&2
  exit 1
fi
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 \
  -c "ALTER USER \"${PG_USER}\" WITH PASSWORD '${POSTGRES_PASSWORD}';"

echo "==> Restart api (and web/nginx if needed)"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$ENV_FILE")
"${COMPOSE[@]}" up -d api
echo "==> Waiting for /ready (migrations can take 30–60s)..."
ready=0
for i in $(seq 1 45); do
  if docker exec margem-prod-api-1 python -c "
import urllib.request
urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/ready', headers={'Host': 'api.dribex.ma'}))
" 2>/dev/null; then
    ready=1
    echo "API ready OK (${i}s)"
    break
  fi
  sleep 2
done
if [[ "$ready" -eq 1 ]]; then
  echo "==> Bring up web + nginx"
  "${COMPOSE[@]}" up -d web nginx
else
  echo "API still not ready — check: docker logs margem-prod-api-1 --tail 40" >&2
  exit 1
fi
