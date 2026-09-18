#!/usr/bin/env bash
# Canonical production deployment (on-prem VPS).
# Runs: env validation → backup → build → Alembic migrations → full stack → /ready check.
#
# Run from souq-local root on the server after editing infra/onprem/.env.prod.
#
# Emergency only (skips backup failure abort): SKIP_PRE_DEPLOY_BACKUP=1
#
# Vault: bundled Vault is bootstrap-only (TLS disabled on internal listener).
# See infra/onprem/README.md § Vault before public launch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ONPREM="$ROOT/infra/onprem"
ENV_FILE="${ENV_FILE:-$ONPREM/.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-$ONPREM/docker-compose.prod.yml}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from infra/onprem/env.prod.example" >&2
  exit 1
fi

export ENV_FILE

echo "==> Validate production environment"
chmod +x "$ONPREM/scripts/validate-production-env.sh"
"$ONPREM/scripts/validate-production-env.sh" "$ENV_FILE"

echo "==> Backup database and media"
if ! "$ONPREM/scripts/backup.sh"; then
  if [[ "${SKIP_PRE_DEPLOY_BACKUP:-}" == "1" ]]; then
    echo "WARNING: pre-deploy backup failed; SKIP_PRE_DEPLOY_BACKUP=1 — continuing" >&2
  else
    echo "Pre-deploy backup failed. Fix backup or set SKIP_PRE_DEPLOY_BACKUP=1 for emergency deploy only." >&2
    exit 1
  fi
fi

echo "==> Build images"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build api web

echo "==> Start data services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres minio redis
sleep 5

echo "==> Run migrations"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm api alembic upgrade head

echo "==> Deploy full production stack"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "==> Health check"
API_URL="$(grep -E '^PUBLIC_API_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")"
curl -fsS "${API_URL}/ready" | head -c 200
echo ""
echo "Deployment complete. Verify public access: $ONPREM/scripts/verify-public-api.sh"
