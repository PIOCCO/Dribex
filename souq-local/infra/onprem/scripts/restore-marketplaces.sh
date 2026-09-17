#!/usr/bin/env bash
# Restore built-in Casablanca marketplaces (after accidental admin delete).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy env.prod.example to .env.prod first." >&2
  exit 1
fi

SQL_FILE="$ROOT/scripts/restore_casablanca_marketplaces.sql"
if [[ ! -f "$SQL_FILE" ]]; then
  echo "Missing $SQL_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

echo "Restoring marketplaces via Postgres (no API rebuild required)..."
"${COMPOSE[@]}" exec -T postgres psql \
  -U "${POSTGRES_USER:-margem}" \
  -d "${POSTGRES_DB:-margem}" \
  -v ON_ERROR_STOP=1 \
  < "$SQL_FILE"
