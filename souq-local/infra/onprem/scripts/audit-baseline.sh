#!/usr/bin/env bash
# Safe local baseline for Dribex + APIO (no production mutations).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOUQ="$(cd "$ROOT/../.." && pwd)"
FAIL=0

note() { echo "==> $*"; }
ok() { echo "OK: $*"; }
bad() { echo "FAIL: $*"; FAIL=1; }

note "Git (souq-local root: $SOUQ)"
if git -C "$SOUQ" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$SOUQ" status -sb | head -20 || true
else
  bad "not a git work tree at $SOUQ"
fi

note "Compose config (prod example env)"
if docker compose version >/dev/null 2>&1; then
  docker compose -f "$ROOT/docker-compose.prod.yml" --env-file "$ROOT/env.prod.example" config >/dev/null \
    && ok "docker-compose.prod.yml" || bad "docker-compose.prod.yml config"
  if [[ -f "$ROOT/env.apio.prod.example" ]]; then
    docker compose -f "$ROOT/docker-compose.prod.yml" -f "$ROOT/docker-compose.apio.prod.yml" \
      --env-file "$ROOT/env.prod.example" config >/dev/null \
      && ok "docker-compose.apio.prod.yml" || bad "apio prod compose config"
  fi
else
  echo "SKIP: docker not available in this environment"
fi

note "Production env validator"
if [[ -x "$ROOT/scripts/validate-production-env.sh" ]]; then
  ENV_TO_CHECK="${AUDIT_ENV_FILE:-}"
  if [[ -z "$ENV_TO_CHECK" ]]; then
    echo "SKIP: set AUDIT_ENV_FILE=/path/to/.env.prod to validate real production env (example files use placeholders)"
  elif [[ ! -f "$ENV_TO_CHECK" ]]; then
    bad "AUDIT_ENV_FILE not found: $ENV_TO_CHECK"
  else
    "$ROOT/scripts/validate-production-env.sh" "$ENV_TO_CHECK" && ok "production env" \
      || bad "production env validation"
  fi
fi

note "APIO source verify"
if [[ -x "$ROOT/scripts/apio-verify-source.sh" ]]; then
  "$ROOT/scripts/apio-verify-source.sh" && ok "apio source" || bad "apio source layout"
fi

note "APIO server offline tests (no running server required)"
if [[ -f "$SOUQ/apio/server/package.json" ]]; then
  (cd "$SOUQ/apio/server" && node scripts/test-admin-members-list.js && node scripts/test-cookie-path.js) \
    && ok "apio offline tests" || bad "apio offline tests"
fi

note "Dribex web production build (requires env)"
if [[ -f "$SOUQ/web/package.json" ]]; then
  (
    cd "$SOUQ/web"
    export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://api.dribex.ma}"
    export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://dribex.ma}"
    npm run build >/dev/null
  ) && ok "web build" || bad "web build (set NEXT_PUBLIC_* if needed)"
fi

note "Dribex backend pytest (requires PostgreSQL on localhost:5432)"
if [[ -f "$SOUQ/backend/requirements-dev.txt" ]]; then
  if command -v python3 >/dev/null && python3 -c "import socket; s=socket.socket(); s.settimeout(1); s.connect(('127.0.0.1',5432)); s.close()" 2>/dev/null; then
    (
      cd "$SOUQ/backend"
      PYTHONPATH=. DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://souq:souq_local_dev@127.0.0.1:5432/souq_local}" \
        JWT_SECRET_KEY="${JWT_SECRET_KEY:-test-jwt-secret-key-minimum-32-characters-long}" \
        UPLOAD_TOKEN_SECRET="${UPLOAD_TOKEN_SECRET:-test-upload-token-secret-key-32chars-min}" \
        ALLOW_MANUAL_BILLING=true python3 -m pytest -q
    ) && ok "backend pytest" || bad "backend pytest"
  else
    echo "SKIP: PostgreSQL not reachable on 127.0.0.1:5432"
  fi
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "Baseline finished with failures."
  exit 1
fi
echo "Baseline finished successfully."
