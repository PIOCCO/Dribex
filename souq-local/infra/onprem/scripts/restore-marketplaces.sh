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

"${COMPOSE[@]}" exec -T api \
  bash -lc 'PYTHONPATH=/app python3 /app/scripts/restore_casablanca_marketplaces.py'
