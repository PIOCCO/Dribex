#!/usr/bin/env bash
# Sync APIO source, rebuild apio-admin image (no cache), recreate container — use when UI looks stale.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/../.." && pwd)"
DRIBEX_ENV="${ENV_FILE_DRIBEX:-$ROOT/.env.prod}"
BUILD_ID="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%dT%H%M%SZ)"

chmod +x "$ROOT/scripts/apio-sync-source.sh" "$ROOT/scripts/apio-verify-source.sh"
"$ROOT/scripts/apio-sync-source.sh"
"$ROOT/scripts/apio-verify-source.sh"

if [[ ! -f "$REPO_ROOT/souq-local/apio/src/components/admin/layout/AdminLayout.tsx" ]]; then
  echo "WARN: AdminLayout.tsx missing in git — pull branch cursor/apio-admin-i18n-8c79 first" >&2
fi

cd "$ROOT"
export DOCKER_BUILDKIT=1
docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file "$DRIBEX_ENV" build --no-cache --build-arg "APIO_ADMIN_UI_BUILD=$BUILD_ID" apio-admin

docker compose -f docker-compose.prod.yml -f docker-compose.apio.prod.yml \
  --env-file "$DRIBEX_ENV" up -d --force-recreate apio-admin

echo
echo "==> Verify bundled UI inside container"
docker exec margem-prod-apio-admin-1 ls -la /app/admin/dist/assets/ 2>/dev/null | tail -3 || true
docker exec margem-prod-apio-admin-1 wget -qO- http://127.0.0.1:${APIO_ADMIN_PORT:-7218}/ 2>/dev/null | head -5 || \
  docker exec margem-prod-apio-admin-1 wget -qO- http://127.0.0.1:7217/ 2>/dev/null | head -5 || true

echo
echo "Open admin in a private window. Footer should show: Version interface: $BUILD_ID"
echo "If you still see the old single-column UI, the build did not include AdminLayout — re-run apio-sync-source after git pull."
