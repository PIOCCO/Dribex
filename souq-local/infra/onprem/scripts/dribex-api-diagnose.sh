#!/usr/bin/env bash
# Why margem-prod-api-1 is Exited / unhealthy (Cloudflare 521 on dribex.ma).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$ENV_FILE")
CID="${1:-margem-prod-api-1}"

echo "==> Compose status"
"${COMPOSE[@]}" ps api postgres redis minio nginx 2>/dev/null || true

echo
echo "==> Last 80 lines: $CID"
docker logs "$CID" --tail 80 2>&1 || echo "(no logs — container missing)"

echo
echo "==> Exit code / state"
docker inspect "$CID" --format 'State={{.State.Status}} ExitCode={{.State.ExitCode}} OOM={{.State.OOMKilled}} Error={{.State.Error}}' 2>/dev/null || true

echo
echo "==> Dependencies"
for dep in margem-prod-postgres-1 margem-prod-redis-1 margem-prod-minio-1; do
  docker inspect "$dep" --format '{{.Name}} {{.State.Status}}' 2>/dev/null || echo "$dep not found"
done

echo
echo "==> Env validation (host)"
if [[ -f "$ROOT/scripts/validate-production-env.sh" ]]; then
  "$ROOT/scripts/validate-production-env.sh" "$ENV_FILE" || true
else
  echo "skip validate-production-env.sh"
fi

echo
echo "==> In-container /ready (if api is running)"
if docker ps -q -f "name=^/${CID}$" | grep -q .; then
  docker exec "$CID" python -c "
import urllib.request
try:
  urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/ready', headers={'Host': 'api.dribex.ma'}))
  print('ready: OK')
except Exception as e:
  print('ready: FAIL', e)
" 2>&1 || true
fi

echo
cat <<'EOF'
==> Common log patterns → fix

  "password authentication failed for user" → POSTGRES_PASSWORD in .env.prod ≠ password in postgres volume; run: ./scripts/dribex-postgres-sync-password.sh
  "Database not ready"     → start postgres: docker compose … up -d postgres; check POSTGRES_* in .env.prod
  "Settings validation"    → fix .env.prod (JWT_SECRET_KEY, BREVO_API_KEY, ADMIN_IP_ALLOWLIST, …)
  "Alembic migration failed" → docker compose … run --rm api alembic upgrade head (after backup)
  "Media directory not writable" → chown media volume (see entrypoint.sh message)
  OOMKilled=true           → raise api memory limit or reduce load

==> Recover stack (after fixing .env / DB)

  cd ~/MarGem/souq-local/infra/onprem
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres redis minio
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d web nginx
  ./scripts/production-gate-check.sh

Canonical deploy (migrations + backup): cd ~/MarGem/souq-local && ./scripts/production-deploy.sh
EOF
