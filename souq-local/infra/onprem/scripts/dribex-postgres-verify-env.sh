#!/usr/bin/env bash
# Ensure .env.prod has exactly one POSTGRES_PASSWORD and it matches what the api container uses.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

matches=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | wc -l | tr -d ' ')
if [[ "$matches" -ne 1 ]]; then
  echo "FAIL: expected exactly one POSTGRES_PASSWORD= line in $ENV_FILE, found $matches" >&2
  grep -n '^POSTGRES_PASSWORD=' "$ENV_FILE" >&2 || true
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

echo "POSTGRES_USER=${POSTGRES_USER:-margem} POSTGRES_DB=${POSTGRES_DB:-margem}"
echo "POSTGRES_PASSWORD length: ${#POSTGRES_PASSWORD}"

if docker ps -qf 'name=margem-prod-api-1' | grep -q .; then
  echo
  echo "==> DATABASE_URL inside api (password redacted)"
  docker exec margem-prod-api-1 printenv DATABASE_URL 2>/dev/null \
    | sed -E 's/(:)[^@]+(@)/:\1***\2/' || true
fi

if docker ps -qf 'name=margem-prod-postgres-1' | grep -q .; then
  echo
  echo "==> TCP auth test (same as asyncpg)"
  if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" margem-prod-postgres-1 \
    psql -h 127.0.0.1 -U "${POSTGRES_USER:-margem}" -d "${POSTGRES_DB:-margem}" -c 'SELECT 1 AS ok' 2>/dev/null; then
    echo "OK: password in $ENV_FILE works against postgres"
  else
    echo "FAIL: password in $ENV_FILE rejected — run: ./scripts/dribex-postgres-sync-password.sh" >&2
    exit 1
  fi
fi
